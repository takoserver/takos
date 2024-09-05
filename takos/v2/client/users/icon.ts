import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Friends from "@/models/friends.ts";
import Sessionid from "@/models/sessionid.ts";
import { load } from "@std/dotenv";
import { splitUserName } from "@/utils/utils.ts";
import requests from "@/models/requests.ts";
const env = await load();

const app = new Hono();

app.get("/friend", async (c: Context) => {
  const cookie = getCookie(c, "sessionid");
  if (!cookie) {
    return c.json({
      status: false,
      message: "sessionid is not found",
    });
  }
  const sessionInfo = await Sessionid.findOne({ sessionid: cookie });
  if (!sessionInfo) {
    return c.json({
      status: false,
      message: "session is not found",
    });
  }
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ status: false });
  }
  const { userName: targetUserName, domain: targetDomain } = splitUserName(
    userName,
  );
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false });
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false }, 400);
  }
  const userFriendData = await Friends.findOne({
    userName: sessionInfo.userName,
    friendId: userName,
  });
  if (!userFriendData) {
    return c.json({ status: false });
  }
  const icon = await Deno.readFile(
    `./files/userIcon/${splitUserName(userName).userName}.jpeg`,
  );
  return c.body(icon);
});

app.get("/requester", async (c: Context) => {
  const cookie = getCookie(c, "sessionid");
  if (!cookie) {
    return c.json({
      status: false,
      message: "sessionid is not found",
    });
  }
  const sessionInfo = await Sessionid.findOne({ sessionid: cookie });
  if (!sessionInfo) {
    return c.json({
      status: false,
      message: "session is not found",
    });
  }
  const userName = c.req.query("userName");
  if (!userName) {
    return c.json({ status: false });
  }
  const { userName: targetUserName, domain: targetDomain } = splitUserName(
    userName,
  );
  if (!targetUserName || !targetDomain) {
    return c.json({ status: false });
  }
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false }, 400);
  }
  const isRequester = await requests.findOne({
    type: "friend",
    targetName: sessionInfo.userName,
    requesterId: userName,
  });
  console.log(isRequester, userName);
  if (!isRequester) {
    return c.json({ status: false });
  }
  const icon = await Deno.readFile(`./files/userIcon/${targetUserName}.jpeg`);
  return c.body(icon);
});

export default app;
