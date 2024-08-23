import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import User from "../../../models/users.ts";
import Sessionid from "@/models/sessionid.ts";

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
  return c.json({
    status: true,
    data: {
      userName: userInfo.userName,
      nickName: userInfo.nickName,
      age: userInfo.age,
      setup: userInfo.setup,
      devicekey: session.deviceKey,
    },
  }, 200);
});

export default app;
