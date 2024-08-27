import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import Friends from "@/models/friends.ts";
import FriendRoom from "@/models/friend/room.ts";
import FriendMessage from "@/models/friend/message.ts";
import { load } from "@std/dotenv";
import { splitUserName } from "@/utils/utils.ts";
const env = await load();

const app = new Hono();

app.get("/", async (c) => {
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
  const result: {
    type: string;
    userName?: string;
    nickName?: string;
    roomId?: string;
    isCreatedRoom: boolean;
    roomName?: string;
    latestMessage?: any;
  }[] = [];
  const friends = await Friends.find({ userName: userInfo.userName });
  for (const friend of friends) {
    const { userName: friendName, domain: friendDomain } = splitUserName(friend.friendId);
    if(env["DOMAIN"] !== friendDomain) continue;
    if(!friendName) continue;
    const friendInfo = await User.findOne({ userName: friendName });
    if(!friendInfo || !friendInfo.nickName) continue;
    if(!friendInfo) continue;
    const room = await FriendRoom.findOne({
      users: {
        $all: [userInfo.userName + "@" + env["DOMAIN"], friend.friendId],
      },
    });
    if (!room) {
      result.push({
        type: "friend",
        userName: friend.friendId,
        isCreatedRoom: false,
        nickName: friendInfo?.nickName,
      });
      continue;
    }
    const latestMessage = await FriendMessage.findOne({
      roomId: room.roomid,
    }).sort({ timestamp: -1 });
    result.push({
      type: "room",
      userName: friend.friendId,
      latestMessage,
      isCreatedRoom: true,
      nickName: friendInfo?.nickName,
    });
  }
  return c.json({ status: true, result });
});

export default app;