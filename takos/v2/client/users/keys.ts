import { Context, Hono } from "hono";
import app from "@/v2/client/ping.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import Friends from "@/models/friends.ts";
import Keys from "@/models/keys/keys.ts";
import { load } from "@std/dotenv";
import { splitUserName } from "@/utils/utils.ts";
import User from "@/models/users.ts";
import Requests from "@/models/requests.ts";
const env = await load();

app.get("/:userId/friend", async (c: Context) => {
  const userId = c.req.param("userId");
  if (!userId) {
    return c.json({ status: false, error: "userName is not found" }, {
      status: 400,
    });
  }
  const cookie = getCookie(c, "sessionid");
  if (!cookie) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 500,
    });
  }
  const session = await Sessionid.findOne({ sessionid: cookie });
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 500,
    });
  }
  const userInfo = await User.findOne({ userName: session.userName });
  const {
    userName: targetUserName,
    domain: targetDomain,
  } = splitUserName(userId);
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false }, 400);
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false }, 400);
  }
  const isFriend = await (async () => {
    const friend = await Friends.findOne({
      userName: session.userName,
      friendId: userId,
    });
    if (friend) return true;
    return false;
  })();
  if (!isFriend) {
    return c.json({ status: false }, 400);
  }
  const userKeys = await Keys.findOne({ userName: targetUserName });
  if (!userKeys) {
    return c.json({ status: false }, 400);
  }
  return c.json({
    status: true,
    keys: {
      accountKey: userKeys.accountKeyPub,
      identityKey: userKeys.identityKeyPub,
      masterKey: userInfo?.masterKey,
    },
  });
});
app.get("/:userId/friendRequest", async (c: Context) => {
  const userId = c.req.param("userId");
  if (!userId) {
    return c.json({ status: false, error: "userName is not found" }, {
      status: 400,
    });
  }
  const cookie = getCookie(c, "sessionid");
  if (!cookie) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 500,
    });
  }
  const session = await Sessionid.findOne({ sessionid: cookie });
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
  const {
    userName: targetUserName,
    domain: targetDomain,
  } = splitUserName(userId);
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false }, 400);
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false }, 400);
  }
  const isRequested = !!await Requests.findOne({
    targetName: userInfo.userName,
    requesterId: userId,
  });
  if (!isRequested) {
    return c.json({ status: false }, 400);
  }
  const userKeys = await Keys.findOne({ userName: targetUserName });
  if (!userKeys) {
    return c.json({ status: false }, 400);
  }
  return c.json({
    status: true,
    keys: {
      accountKey: userKeys.accountKeyPub,
      identityKey: userKeys.identityKeyPub,
      masterKey: userInfo?.masterKey,
    },
  });
});

export default app;
