import { zValidator } from "@hono/zod-validator";
import app from "../userInfo.ts";
import { z } from "zod";
import friends from "../models/friends.ts";
import { load } from "@std/dotenv";
import { isValidMessage } from "@takos/takos-encrypt-ink";
import Message from "../models/message.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
import publish from "../utils/redisClient.ts";
const env = await load();

app.post("send",
    zValidator(
        "json",
        z.object({
            roomId: z.string(),
            message: z.string(),
            sign: z.string(),
            type: z.string(),
        })
    ),
    async (c) => {
    const user = c.get("user");
    if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    const { roomId, message, sign, type } = c.req.valid("json");
    if(type === "friend") {
        if (!friends.findOne({ userName: user.userName + "@" + env["domain"], friendId: roomId })) {
            return c.json({ message: "Unauthorized" }, 401);
        }
        if(!isValidMessage(message)) {
            return c.json({ message: "Invalid message" }, 400);
        }
        const messageid = uuidv7() + "@" + env["domain"];
        const timestamp = new Date();
        await Message.create({
            userName: user.userName + "@" + env["domain"],
            timestamp,
            roomId,
            messageid,
            isEncrypted: true,
            isSigned: true,
            message,
            sign,
        })
        publish({
            type: "message",
            users: [user.userName + "@" + env["domain"], roomId],
            data: JSON.stringify({
                messageid,
                timestamp,
                userName: user.userName + "@" + env["domain"],
            }),
        })
        if(roomId.split("@")[1] !== env["domain"]) {
            const res = await fff(
                "_takos/v2/message/send",
                JSON.stringify({
                    senderId: user.userName + "@" + env["domain"],
                    roomId,
                    messageId: messageid,
                    roomType: "friend",
                    eventId: uuidv7(),
                    type: "sendMessage",
                }),
                [roomId.split("@")[1]],
            ) as [Response] | { error: string }
            if("error" in res) {
                return c.json({ message: res.error }, 500);
            }
            console.log(await res[0].json());
            if(res[0].status !== 200) {
                return c.json({ message: "Failed to send message" }, 500);
            }
        }
        return c.json({ message: "Success" }, 200);
    }
});

app.get("friend/:roomId", async (c) => {
    const user = c.get("user");
    if (!user) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    const roomId = c.req.param("roomId");
    const limit = Number(c.req.query("limit")) || 50;
    const bfore = c.req.query("before")
    if (!friends.findOne({ userName: user.userName + "@" + env["domain"], friendId: roomId })) {
        return c.json({ message: "Unauthorized" }, 401);
    }
    if(!bfore) {
        const myMessages = await Message.find({ roomId, userName: user.userName + "@" + env["domain"] },{ messageid: 1, timestamp: 1, userName:1, _id: 0}).limit(limit).sort({ timestamp: -1 });
        const friendMessages = await Message.find({ roomId: user.userName + "@" + env["domain"], userName: roomId },{ messageid: 1, timestamp: 1, userName:1, _id: 0}).limit(limit).sort({ timestamp: -1 });
        const messages = myMessages.concat(friendMessages).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        messages.splice(limit);
        return c.json({ messages });
    }
    const beforeMessageId = await Message.findOne({ roomId, timestamp: { $lt: new Date(bfore) } }).sort({ timestamp: -1 });
    if(!beforeMessageId) {
        return c.json({ error: "Invalid before" }, 400);
    }
    const beforemessageTime = beforeMessageId.timestamp
    const myMessages = await Message.find({ roomId, userName: user.userName + "@" + env["domain"], timestamp: { $lt: beforemessageTime } },
        { messageid: 1, timestamp: 1, userName:1, _id: 0}
    ).limit(limit).sort({ timestamp: -1 });
    const friendMessages = await Message.find({ roomId: user.userName + "@" + env["domain"], userName: roomId, timestamp: { $lt: beforemessageTime } },{ messageid: 1, timestamp: 1, userName:1, _id: 0}).limit(limit).sort({ timestamp: -1 });
    const messages = myMessages.concat(friendMessages).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    messages.splice(limit);
    return c.json({ messages });
});

export default app;