import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import Requests from "@/models/requests.ts";
import { load } from "@std/dotenv";
import { acceptFriendRequest } from "@/v2/client/friends/acceptActions.ts";
const env = await load();

const app = new Hono();

app.post("/", async (c) => {
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
  const { uuid } = body;
  if (!uuid) return c.json({ status: false }, 400);
  const request = await Requests.findOne({ uuid });
  if (!request) return c.json({ status: false }, 400);
  if (request.targetName !== userInfo.userName) {
    return c.json({ status: false }, 400);
  }
  switch (request.type) {
    case "friend": {
      await acceptFriendRequest(
        c,
        request,
      );
      break;
    }
    default:
      return c.json({ status: false }, 400);
  }
});

export default app;