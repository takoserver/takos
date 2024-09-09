import { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import FriendRoom from "@/models/friend/room.ts";
import { splitUserName } from "@/utils/utils.ts";
import Keys from "@/models/keys/keys.ts";
import { load } from "@std/dotenv";
const env = await load();

const app = new Hono();

app.get("/accountKey/friend", async (c: Context) => {
    const sessionid = getCookie(c, "sessionid");
    if (!sessionid) {
        return c.json({ status: false, message: "Unauthorized" }, 401);
    }
    const session = await Sessionid.findOne({ sessionid });
    if (!session) {
        return c.json({ status: false, message: "Unauthorized" }, 401);
    }
    const userInfo = await User.findOne({
        userName: session.userName,
    });
    if (!userInfo) {
        return c.json({ status: false, message: "Unauthorized" }, 401);
    }
    let body;
    try {
        body = await c.req.json();
    } catch (e) {
        return c.json({ status: false, message: "Invalid body" }, 400);
    }
    const { friendId } = body;
    if(!friendId) {
        return c.json({ status: false, message: "friendId is required" }, 400);
    }
    const room = await FriendRoom.findOne({
        users: { $all: [session.userName, friendId] },
    });
    if (!room) {
        return c.json({ status: false, message: "Room not found" }, 404);
    }

    const { userName: targetUserName, domain: targetDomain } = splitUserName(
        friendId,
    );
    if(targetDomain !== env["DOMAIN"]) {
        return c.json({ status: false, message: "Invalid domain" }, 400);
    }
    const friendAccount = Keys.findOne({
        userName: targetUserName,
    });
    if (!friendAccount) {
        return c.json({ status: false, message: "Account not found" }, 404);
    }
    return c.json({ status: true, accountKey: [friendAccount.accountKeyPub] });
});
export default app;