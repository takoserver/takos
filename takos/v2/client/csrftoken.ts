import { Hono } from "hono";
import { load } from "@std/dotenv";
import Csrftoken from "@/models/csrftoken.ts";
import { cors } from "hono/cors";
import Sessionid from "../../models/sessionid.ts";
import { getCookie } from "hono/cookie";
const env = await load();
const origins = env["allowed_origins"].split(",");
const app = new Hono();

app.use(
  "*",
  cors({
    origin: origins,
  }),
);

app.get("/", async (c) => {
  const sessionId = getCookie(c, "sessionid");
  if (!sessionId) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  const isTrueSessionId = await Sessionid.findOne({
    sessionId: sessionId,
  });
  if (!isTrueSessionId) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  const csrftoken = Array.from(
    array,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  await Csrftoken.create({
    token: csrftoken,
    sessionId: sessionId,
  });
  c.json({ token: csrftoken, status: true }, { status: 200 });
});
export default app;
