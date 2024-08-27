import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import { load } from "@std/dotenv";
import Friends from "@/models/friends.ts";
import FriendRoom from "@/models/friend/room.ts";
import FriendMessage from "@/models/friend/message.ts";
import { splitUserName } from "@/utils/utils.ts";
import uuid from "ui7";
import roomkeys from "@/models/friend/roomkeys.ts";
const env = await load();

const app = new Hono();

app.post("/", async (c) => {
  const sessionid = getCookie(c, "sessionid");
  if (!sessionid) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 500,
    });
  }
  const session = await Sessionid.findOne({ sessionid: sessionid });
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 500,
    });
  }
  const userInfo = await User.findOne({ userName: session.userName });
  if (!userInfo) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ status: false }, 400);
  }
  const {
    userName,
    roomKey,
  } = body;
  const { userName: targetUserName, domain: targetDomain } = splitUserName(
    userName,
  );
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false }, 400);
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false }, 400);
  }
  //roomKeyが { userId: string, key: Object }[] であることを確認
  const roomKeyJson = JSON.parse(roomKey);
  if (!Array.isArray(roomKeyJson)) {
    return c.json({ status: false }, 400);
  }
  for (const key of roomKeyJson) {
    if (typeof key.userId !== "string" || typeof key.key !== "object") {
      return c.json({ status: false }, 400);
    }
  }
  const friend = await Friends.findOne({
    userName: userInfo.userName,
    friendId: userName,
  });
  if (!friend) {
    return c.json({ status: false }, 400);
  }
  const room = await FriendRoom.findOne({
    users: {
      $all: [userInfo.userName + "@" + env["DOMAIN"], userName],
    },
  });
  if (room) {
    return c.json({ status: false }, 400);
  }
  const roomid = uuid() + "@" + env["DOMAIN"];
  await FriendRoom.create({
    roomid,
    users: [userInfo.userName + "@" + env["DOMAIN"], userName],
    roomKey: roomKeyJson,
  });
  await roomkeys.create({
    roomid,
    keys: roomKeyJson,
  });
  return c.json({ status: true });
});
