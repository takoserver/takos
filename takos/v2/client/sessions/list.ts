import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";

const app = new Hono();

app.get("/", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid");
  const session = await Sessionid.findOne({ sessionid: sessionid });
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 500,
    });
  }
  const sessions = await Sessionid.find({ userName: session.userName });
    return c.json({
        status: true,
        data: sessions,
    }, 200);
});

export default app;