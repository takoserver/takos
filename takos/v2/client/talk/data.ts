import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import Friends from "@/models/friends.ts";
import FriendRoom from "@/models/friend/room.ts";
import FriendMessage from "@/models/friend/message.ts";
import FriendKeys from "@/models/friend/roomkeys.ts";
import { load } from "@std/dotenv";
import { splitUserName } from "@/utils/utils.ts";
const env = await load();

const app = new Hono();

app.get("/friend", async (c) => {
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
  const userName = c.req.query("userName");
  if (!userName) return c.json({ status: false }, 400);
  const {
    userName: targetUserName,
    domain: targetDomain,
  } = splitUserName(userName);
  if (!targetUserName || !targetDomain) return c.json({ status: false }, 400);
  if (targetDomain !== env["DOMAIN"]) return c.json({ status: false }, 400);
  const FriendRooms = await FriendRoom.findOne({
    users: {
      $all: [
        userInfo.userName + "@" + env["DOMAIN"],
        targetUserName + "@" + targetDomain,
      ],
    },
  });
  if (!FriendRooms) {
    return c.json({
      status: false,
      isCreatedRoom: false,
      talkData: [],
    });
  }
  const talkData = [];
  const limit = c.req.query("limit") || 50;
  if (Number(limit) > 100) return c.json({ status: false }, 400);
  const messages = await FriendMessage.find({
    roomId: FriendRooms.roomid,
  }).sort({ timestamp: -1 }).limit(Number(limit));

  for (const message of messages) {
    talkData.push({
      message: message.messageObj,
      timestamp: message.timestamp,
      userId: message.userId,
    });
  }
  return c.json({
    status: true,
    isCreatedRoom: true,
    talkData,
  });
});
