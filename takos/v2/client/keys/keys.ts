import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import Keys from "@/models/keys/keys.ts";
import { splitUserName } from "@/utils/utils.ts";
import { load } from "@std/dotenv";
const env = await load();

const app = new Hono();

app.get("/", async (c) => {
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
  const kind = c.req.query("kind");
  const query = c.req.query("query");
  const userName = c.req.query("userName");
  if (!kind || !userName) {
    return c.json({ status: false, error: "kind or query is not found" }, {
      status: 500,
    });
  }
  if (
    splitUserName(userName).domain == env["DOMAIN"] ||
    splitUserName(userName).domain == ""
  ) {
    if (kind === "latest") {
      const keys = await Keys.find({ userName: userName }).sort({
        timestamp: -1,
      }).limit(1);
      return c.json({
        status: true,
        data: keys[0],
      }, 200);
    }
    if (kind === "all") {
      const keys = await Keys.find({ userName: userName });
      return c.json({
        status: true,
        data: keys,
      }, 200);
    }
    if (!query) {
      return c.json({ status: false, error: "kind or userName is not found" }, {
        status: 500,
      });
    }
    if (kind === "hashHex") {
      const keys = await Keys.find({ userName: userName, hashHex: query });
      return c.json({
        status: true,
        data: keys,
      }, 200);
    }
  }
});

export default app;
