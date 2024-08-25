import { Hono } from "hono";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import { getCookie } from "hono/cookie";
import keyShareSessionId from "@/models/keys/keyShareSessionId.ts";
import pubClient from "@/utils/pubClient.ts";

const app = new Hono();

app.post("/requestKeyShare", async (c) => {
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
  const { migrateKey } = body;
  if (!migrateKey) return c.json({ status: false }, 400);
  const sessionId = crypto.getRandomValues(new Uint8Array(16)).join("");
  await keyShareSessionId.create({
    keyShareSessionId: sessionId,
    migrateKeyPublic: migrateKey,
  });
  pubClient(JSON.stringify({
    type: "keyShareRequest",
    sessionId,
    userName: userInfo.userName,
  }));
  return c.json({ status: true, sessionId });
});

app.post("/acceptKeyShareRequest", async (c) => {
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
  const { sessionId, migrateDataSignKey } = body;
  if (!sessionId || !migrateDataSignKey) return c.json({ status: false }, 400);
  const keyShareSession = await keyShareSessionId.findOne({
    keyShareSessionId: sessionId,
  });
  if (!keyShareSession) return c.json({ status: false }, 400);
  await keyShareSession.updateOne({
    migrateDataSignKeyPublic: migrateDataSignKey,
  });
  pubClient(JSON.stringify({
    type: "keyShareAccept",
    sessionId,
    userName: userInfo.userName,
  }));
  return c.json({ status: true });
});

app.get("/migrateDataSignKey", async (c) => {
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
  const keyShareSessionid = c.req.query("sessionId");
  if (!keyShareSessionid) return c.json({ status: false }, 400);
  const keyShareSession = await keyShareSessionId.findOne({
    keyShareSessionId: keyShareSessionid,
  });
  if (!keyShareSession) return c.json({ status: false }, 400);
  return c.json({
    status: true,
    migrateDataSignKeyPublic: keyShareSession.migrateDataSignKeyPublic,
  });
});

app.get("/migrateKey", async (c) => {
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
  const keyShareSessionid = c.req.query("sessionId");
  if (!keyShareSessionid) return c.json({ status: false }, 400);
  const keyShareSession = await keyShareSessionId.findOne({
    keyShareSessionId: keyShareSessionid,
  });
  if (!keyShareSession) return c.json({ status: false }, 400);
  return c.json({
    status: true,
    migrateKeyPublic: keyShareSession.migrateKeyPublic,
  });
});

app.get("/keyShareData", async (c) => {
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
  const keyShareSessionid = c.req.query("sessionId");
  if (!keyShareSessionid) return c.json({ status: false }, 400);
  const keyShareSession = await keyShareSessionId.findOne({
    keyShareSessionId: keyShareSessionid,
  });
  if (!keyShareSession) return c.json({ status: false }, 400);
  return c.json({
    status: true,
    sign: keyShareSession.sign,
    data: keyShareSession.data,
  });
});

app.post("/sendKeyShareData", async (c) => {
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
  const { sessionId, sign, data } = body;
  if (!sessionId || !sign || !data) return c.json({ status: false }, 400);
  const keyShareSession = await keyShareSessionId.findOne({
    keyShareSessionId: sessionId,
  });
  if (!keyShareSession) return c.json({ status: false }, 400);
  await keyShareSession.updateOne({
    sign,
    data,
  });
  pubClient(JSON.stringify({
    type: "keyShareData",
    sessionId,
    userName: userInfo.userName,
  }));
  return c.json({ status: true });
});

export default app;
