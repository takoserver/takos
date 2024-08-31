import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import FriendRoom from "@/models/friend/room.ts";
import FriendMessage from "@/models/friend/message.ts";
import FriendKeys from "@/models/friend/roomkeys.ts";
import { load } from "@std/dotenv";
import { EncryptedDataAccountKey } from "takosEncryptInk";
import uuid from "ui7";
const env = await load();

const app = new Hono();

app.post("/:userId/friend", async (c) => {
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
  if(message instanceof EncryptedDataAccountKey){
    return c.json({ status: false, message: "Invalid body" }, 400);
  }
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
  if (latestKey.keyHashHex !== message.keyHashHex) {
    return c.json({ status: false, message: "Invalid key" }, 400);
  }
  await FriendMessage.create({
    roomid,
    userId: session.userName + "@" + env["DOMAIN"],
    messageObj: message,
    read: false,
    messageid: uuid(),
    roomKeyHashHex: message.keyHashHex,
  });
  return c.json({ status: true });
});

export default app;