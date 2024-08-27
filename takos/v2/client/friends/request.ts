import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import { splitUserName } from "@/utils/utils.ts";
import { load } from "@std/dotenv";
import Friends from "@/models/friends.ts";
import sendRequests from "@/models/sendRequests.ts";
import requests from "@/models/requests.ts";
import uuid, { timestamp } from "ui7";
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
  const { userName } = body;
  if (!userName) return c.json({ status: false }, 400);
  const {
    userName: targetUserName,
    domain: targetDomain,
  } = splitUserName(userName);
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false }, 400);
  }
  const isFriend = await (async () => {
    const friend = await Friends.findOne({
      userName: userInfo.userName,
      friendId: userName,
    });
    if (friend) return true;
  })();
  if (isFriend) {
    return c.json({ status: false, error: "already friend" }, {
      status: 500,
    });
  }
  const isSentFriendRequest = await (async () => {
    const request = await sendRequests.findOne({
      requesterName: userInfo.userName,
      targetId: userName,
    });
    if (request) return true;
  })();
  if (isSentFriendRequest) {
    return c.json({ status: false, error: "already sent request" }, {
      status: 500,
    });
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false, error: "developing now" }, {
      status: 500,
    });
  }
  const requestUuid = uuid();
  await sendRequests.create({
    requesterName: userInfo.userName,
    targetId: userName,
    request: {},
    type: "friend",
    uuid: requestUuid,
  });
  await requests.create({
    requesterId: userInfo.userName + "@" + env["DOMAIN"],
    targetName: targetUserName,
    request: {},
    type: "friend",
    uuid: requestUuid,
  });
  return c.json({ status: true });
});

export default app;