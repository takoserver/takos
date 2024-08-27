import { Hono } from "hono";
import app from "@/v2/client/ping.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";

app.get("/:userId/accountKey", async (c) => {
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
});
