import { zValidator } from "@hono/zod-validator";
import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Hono } from "hono";
const app = new Hono<MyEnv>();
app.use("*", authorizationMiddleware);
import { z } from "zod";
import friends from "../models/friends.ts";
import { load } from "@std/dotenv";
import { isValidMessage } from "@takos/takos-encrypt-ink";
import Message from "../models/message.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
import publish from "../utils/redisClient.ts";
import { Member } from "../models/groups.ts";
import { channel } from "node:diagnostics_channel";
const env = await load();

app.post(
  "send",
  zValidator(
    "json",
    z.object({
      roomId: z.string(),
      message: z.string(),
      sign: z.string(),
      type: z.string(),
      channelId: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { roomId, message, sign, type, channelId } = c.req.valid("json");
    if (type === "friend") {
      if (
        !friends.findOne({
          userName: user.userName + "@" + env["domain"],
          friendId: roomId,
        })
      ) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      if (!isValidMessage(message)) {
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
      });
      publish({
        type: "message",
        users: [user.userName + "@" + env["domain"], roomId],
        data: JSON.stringify({
          messageid,
          timestamp,
          userName: user.userName + "@" + env["domain"],
          roomid: roomId,
        }),
      });
      if (roomId.split("@")[1] !== env["domain"]) {
        const res = await fff(
          JSON.stringify({
            event: "t.message.send",
            eventId: uuidv7(),
            payload: {
              userId: user.userName + "@" + env["domain"],
              messageId: messageid,
              roomId: roomId,
              roomType: "friend",
            },
          }),
          [roomId.split("@")[1]],
        ) as [Response] | { error: string };
        if ("error" in res) {
          return c.json({ message: res.error }, 500);
        }
        console.log(await res[0].json());
        if (res[0].status !== 200) {
          return c.json({ message: "Failed to send message" }, 500);
        }
      }
      return c.json({ message: "Success" }, 200);
    }
    if (type === "group") {
      const match = roomId.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const friendUserName = match[1];
      const domainFromRoom = match[2];
      if (!channelId) return;
      if (
        !await Member.findOne({
          groupId: friendUserName + "@" + domainFromRoom,
          userId: user.userName + "@" + env["domain"],
        })
      ) {
        return c.json({ message: "Unauthorized2" }, 401);
      }
      if (!isValidMessage(message)) {
        return c.json({ message: "Invalid message" }, 400);
      }
      if (!isValidMessage(message)) {
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
        channelId: channelId,
      });
      const Members = (await Member.find({ groupId: friendUserName + "@" + domainFromRoom })).map((member) =>
        member.userId
      );
      const MembersDomain = Members.map((member) => member.split("@")[1]);
      //重複を削除
      const MembersSet = new Set(MembersDomain);
      const MembersArray = Array.from(MembersSet);
      const findMember = MembersArray.findIndex((member) =>
        member === env["domain"]
      );
      if (findMember !== -1) {
        MembersArray.splice(findMember, 1);
      }
      publish({
        type: "message",
        users: Members,
        data: JSON.stringify({
          messageid,
          timestamp,
          userName: user.userName + "@" + env["domain"],
          roomid: roomId,
        }),
      });
      await fff(
        JSON.stringify({
          event: "t.message.send",
          eventId: uuidv7(),
          payload: {
            userId: user.userName + "@" + env["domain"],
            messageId: messageid,
            roomId: roomId,
            roomType: "group",
          },
        }),
        MembersArray,
      );
      return c.json({ message: "Success" }, 200);
    }
  },
);

app.get("friend/:roomId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const roomId = c.req.param("roomId");
  // roomIdは "m{userName}@domain"
  // userNameとdomainに分ける
  //"m{" + user.userName + "}@" + env["domain"]
  const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
  if (!match) {
    return c.json({ error: "Invalid roomId format" }, 400);
  }
  const friendUserName = match[1];
  const domainFromRoom = match[2];
  const limit = Number(c.req.query("limit")) || 50;
  const bfore = c.req.query("before");
  if (
    !friends.findOne({
      userName: user.userName + "@" + env["domain"],
      friendId: friendUserName + "@" + domainFromRoom,
    })
  ) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (!bfore) {
    const myMessages = await Message.find({
      roomId,
      userName: user.userName + "@" + env["domain"],
    }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
      timestamp: -1,
    });
    const friendMessages = await Message.find({
      roomId: "m{" + user.userName + "}@" + env["domain"],
      userName: friendUserName + "@" + domainFromRoom,
    }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
      timestamp: -1,
    });
    const messages = myMessages.concat(friendMessages).sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    messages.splice(limit);
    return c.json({ messages });
  }
  const beforeMessageId = await Message.findOne({
    roomId,
    timestamp: { $lt: new Date(bfore) },
  }).sort({ timestamp: -1 });
  if (!beforeMessageId) {
    return c.json({ error: "Invalid before" }, 400);
  }
  const beforemessageTime = beforeMessageId.timestamp;
  const myMessages = await Message.find({
    roomId,
    userName: user.userName + "@" + env["domain"],
    timestamp: { $lt: beforemessageTime },
  }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
    timestamp: -1,
  });
  const friendMessages = await Message.find({
    roomId: "m{" + user.userName + "}@" + env["domain"],
    userName: friendUserName + "@" + domainFromRoom,
    timestamp: { $lt: beforemessageTime },
  }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
    timestamp: -1,
  });
  const messages = myMessages.concat(friendMessages).sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  messages.splice(limit);
  return c.json({ messages });
});

app.get("group/:roomId/:channelId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const roomId = c.req.param("roomId");
  const channelId = c.req.param("channelId");
  const limit = Number(c.req.query("limit")) || 50;
  const bfore = c.req.query("before");
  if (
    !Member.findOne({
      groupId: roomId,
      userId: user.userName + "@" + env["domain"],
    })
  ) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (!bfore) {
    const messages = await Message.find({
      roomId,
      channelId,
    }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
      timestamp: -1,
    });
    return c.json({ messages });
  }
  const beforeMessageId = await Message.findOne({
    roomId,
    channelId,
    timestamp: { $lt: new Date(bfore) },
  }).sort({ timestamp: -1 });
  if (!beforeMessageId) {
    return c.json({ error: "Invalid before" }, 400);
  }
  const beforemessageTime = beforeMessageId.timestamp;
  const messages = await Message.find({
    roomId,
    channelId,
    timestamp: { $lt: beforemessageTime },
  }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
    timestamp: -1,
  });
  return c.json({ messages });
});

export default app;
