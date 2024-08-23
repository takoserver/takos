import { type Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import User from "../../../models/users.ts";
import Sessionid from "@/models/sessionid.ts";

const app = new Hono();

app.post("/", async (c: Context) => {
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
  await Sessionid.deleteOne({ sessionid });
  setCookie(c, "sessionid", "");
  return c.json({
    status: true,
  }, 200);
});

export default app;
