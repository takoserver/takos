import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { getCookie } from "hono/cookie";
import redis from "redis";
import { load } from "@std/dotenv";

const env = await load();
const redisURL = env["REDIS_URL"];
const redisch = env["REDIS_CH"];
const subClient = redis.createClient({
  url: redisURL,
});
await subClient.connect();
const app = new Hono();
interface WebSocketSessionObject {
  userid: string;
  ws: WebSocket;
  roomid: string;
  roomType: string;
  userName: string;
  lastActivityTime: Date;
}
const sessions = new Map<string, WebSocketSessionObject>();
/**メインコンテンツ開始 */
await subClient.connect();
async function subscribeMessage(channel: string | string[]) {
  await subClient.subscribe(channel, async (message) => {
    const data = JSON.parse(message);
    console.log(data);
    //
  });
}
app.get(
  "/",
  (c) => {
    const cookie = getCookie(c, "sessionid");
    if (!cookie) {
      return c.json({
        status: false,
        message: "sessionid is not found",
      });
    }
    return c.json({
      status: true,
      message: "Hello World",
    });
  },
);
/**メインコンテンツ終了*/
await subscribeMessage(redisch);
function UpdateLastActivityTime(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  sessions.set(sessionId, {
    ...session,
    lastActivityTime: new Date(),
  });
}
function invalidateOldSessions() {
  const now = Date.now();
  for (const [sessionId, obj] of sessions.entries()) {
    const EXPIRATION_TIME = (1 * 60) * 60 * 1000;
    // obj.lastActivityTimeをミリ秒単位の数値に変換
    const lastActivityTimeMs = obj.lastActivityTime.getTime();
    if (now - lastActivityTimeMs > EXPIRATION_TIME) {
      // セッションを無効にする
      sessions.delete(sessionId);
    }
  }
}
setInterval(invalidateOldSessions, 5 * 60 * 1000);

export default app;
