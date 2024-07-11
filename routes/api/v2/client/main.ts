import { getCookies } from "$std/http/cookie.ts";
import ssessionID from "../../../../models/sessionid.ts";
import users from "../../../../models/users.ts";
import redis from "redis";
import pubClient from "../../../../util/redisClient.ts";
import { WebSocketSessionObject } from "../../../../util/types.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
const redisURL = env["REDIS_URL"];
const redisch = env["REDIS_CH"];
const maxMessage = Number(env["MAX_MESSAGE_LENGTH"]);
const subClient = redis.createClient({
  url: redisURL,
});
/**メインコンテンツ開始 */
await subClient.connect();
async function subscribeMessage(channel: string | string[]) {
  await subClient.subscribe(channel, async (message) => {
    const data = JSON.parse(message);
    console.log(data);
  });
}
/**メインコンテンツ終了*/
await subscribeMessage(redisch);
const sessions = new Map<string, WebSocketSessionObject>();
export const handler = {
  GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.onopen = async () => {
        //sessionidを取得
        const cookies = getCookies(req.headers);
        const sessionid = cookies.sessionid;
        const isTrueSessionid = await ssessionID.findOne({ sessionid: sessionid });
        if (!isTrueSessionid) {
          socket.close(1000, "Invalid SessionID");
          return;
        }
        const user = await users.findOne({ uuid: isTrueSessionid.userid });
        if (!user) {
          socket.close(1000, "Invalid User");
          return;
        }
        sessions.set(sessionid, {
          userid: isTrueSessionid.userid,
          ws: socket,
          roomid: "",
          roomType: "",
          lastActivityTime: new Date(),
        });
      };
      socket.onmessage = async function (event) {
        const data = JSON.parse(event.data);
        if (data.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
        }
        if (data.type === "join") {
          const session = sessions.get(data.sessionid);
          if (!session) {
            socket.close(1000, "Invalid SessionID");
            return;
          }
        }
      };
      socket.onclose = () => {
        //
      };
      if (!socket) throw new Error("unreachable");
      return response;
    }
  },
};

// セッションの最後の活動時間を更新する関数
function UpdateLastActivityTime(sessionId: string, Changes: Object) {
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
