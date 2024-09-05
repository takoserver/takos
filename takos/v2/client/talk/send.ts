import { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import FriendRoom from "@/models/friend/room.ts";
import FriendMessage from "@/models/friend/message.ts";
import FriendKeys from "@/models/friend/roomkeys.ts";
import { load } from "@std/dotenv";
import uuid from "ui7";
const env = await load();

const app = new Hono();

app.post("/:userId/friend", async (c: Context) => {
  const friendId = c.req.param("userId");
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
  const { message } = body;
  const room = await FriendRoom.findOne({
    users: { $all: [session.userName, friendId] },
  });
  if (!room) {
    return c.json({ status: false, message: "Room not found" }, 404);
  }
  const roomid = room.roomid;
  const latestKey = (await FriendKeys.find({
    roomid: roomid,
  }).sort({ timestamp: -1 }).limit(1))[0];
  if (!latestKey) {
    return c.json({ status: false, message: "Key not found" }, 404);
  }
  if (latestKey.keyHashHex !== message.encryptedKeyHashHex) {
    return c.json({ status: false, message: "Invalid key" }, 400);
  }
  //最新のメッセージを取得
  const latestMessage = (await FriendMessage.find({
    roomid,
  }).sort({ timestamp: -1 }).limit(1))[0];
  if (!latestMessage) {
    await FriendMessage.create({
      roomid,
      userId: session.userName + "@" + env["DOMAIN"],
      messageObj: message,
      read: false,
      messageid: uuid(),
      roomKeyHashHex: message.encryptedKeyHashHex,
    });
  }
  const priviousHash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(latestMessage.messageObj)),
      ),
    ),
  ).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (priviousHash !== message.previousHashHex) {
    return c.json({ status: false, message: "Invalid previous hash" }, 400);
  }
  await FriendMessage.create({
    roomid,
    userId: session.userName + "@" + env["DOMAIN"],
    messageObj: message,
    read: false,
    messageid: uuid(),
    roomKeyHashHex: message.encryptedKeyHashHex,
  });
  return c.json({ status: true });
});

export default app;
