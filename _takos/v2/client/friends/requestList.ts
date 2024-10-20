import { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import Requests from "@/models/requests.ts";
import User from "@/models/users.ts";
import { load } from "@std/dotenv";
const env = await load();

const app = new Hono();

app.get("/", async (c: Context) => {
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
  const requests = await Requests.find({
    targetName: userInfo.userName,
  });
  return c.json({ status: true, requests });
});

export default app;
