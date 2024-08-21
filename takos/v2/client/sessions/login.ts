import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import User from "../../../models/users.ts";
import { createSessionid } from "@/utils/createSessionid.ts";
import Sessionid from "@/models/sessionid.ts";
const app = new Hono();

app.post("/", async (c) => {
  const sessionId = getCookie(c, "sessionid");
  if (sessionId) {
    const isTrueSessionId = await Sessionid.findOne({
      sessionId: sessionId,
    });
    if (isTrueSessionId) {
      return c.json({ status: false, error: "You Alredy Logged in" }, {
        status: 400,
      });
    }
  }
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    console.log(e);
    return c.json({ status: false, error: "faild to load image" }, {
      status: 500,
    });
  }
  const { email, password, userName } = body;
  if (!password) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (!email && !userName) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (email && userName) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (email) {
    const emailUser = await User.findOne({
      email: email,
    });
    if (emailUser === null) {
      return c.json({ status: false, error: "Not Registered" }, {
        status: 400,
      });
    }
    const saltPassword = password + emailUser.salt;
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(saltPassword),
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    if (hashHex !== emailUser.password) {
      return c.json({ status: false, error: "invalid password" }, {
        status: 400,
      });
    }
    const sessionid = createSessionid();
    await Sessionid.create({
      sessionid,
      uuid: emailUser.uuid,
      enable: true,
    });
    setCookie(c, "sessionid", sessionid);
  }
  if (userName) {
    const userNameUser = await User.findOne({
      userName: userName,
    });
    if (userNameUser === null) {
      return c.json({ status: false, error: "Not Registered" }, {
        status: 400,
      });
    }
    const saltPassword = password + userNameUser.salt;
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(saltPassword),
    );
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    if (hashHex !== userNameUser.password) {
      return c.json({ status: false, error: "invalid password" }, {
        status: 400,
      });
    }
    const sessionid = createSessionid();
    await Sessionid.create({
      sessionid,
      uuid: userNameUser.uuid,
      enable: true,
    });
    setCookie(c, "sessionid", sessionid);
  }
  return c.json({ status: true }, { status: 200 });
});

export default app;
