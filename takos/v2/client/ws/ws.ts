import { Context, Hono } from "hono"
import type { WSContext } from "hono/ws"
import { upgradeWebSocket } from "hono/deno"
import { getCookie } from "hono/cookie"
import redis from "redis"
import { load } from "@std/dotenv"
import Sessionid from "@/models/sessionid.ts"
import { keyShareAccept, keyShareData, keyShareRequest } from "@/v2/client/ws/wsActions.ts"

const env = await load()
const redisURL = env["REDIS_URL"]
const redisch = env["REDIS_CH"]
const subClient = redis.createClient({
  url: redisURL,
})
const app = new Hono()
interface WebSocketSessionObject {
  ws: WSContext
  roomid: string
  roomType: string
  userName: string
  lastActivityTime: Date
}
const sessions = new Map<string, WebSocketSessionObject>()
await subClient.connect()
async function subscribeMessage(channel: string | string[]) {
  await subClient.subscribe(channel, async (message) => {
    const data = JSON.parse(message)
    console.log(data)
    switch (data.type) {
      case "keyShareRequest":
        keyShareRequest(sessions, data.userName, data.keyShareSessionId)
        break
      case "keyShareAccept":
        keyShareAccept(sessions, data.userName, data.keyShareSessionId)
        break
      case "keyShareData":
        keyShareData(sessions, data.userName, data.keyShareSessionId)
        break
    }
  })
}
app.get(
  "/",
  upgradeWebSocket(async (c: Context) => {
    return {
      onOpen: async (event, ws) => {
        const cookie = getCookie(c, "sessionid")
        if (!cookie) {
          return c.json({
            status: false,
            message: "sessionid is not found",
          })
        }
        const sessionInfo = await Sessionid.findOne({ sessionid: cookie })
        if (!sessionInfo) {
          return c.json({
            status: false,
            message: "session is not found",
          })
        }
        const wsSessionid = crypto.getRandomValues(new Uint8Array(16))
          .toString()
        sessions.set(wsSessionid, {
          ws,
          roomid: "",
          roomType: "",
          userName: sessionInfo.userName,
          lastActivityTime: new Date(),
        })
      },
      onMessage: async (event, ws) => {
        if (typeof event.data === "string") {
          const data = JSON.parse(event.data)
        }
      },
    }
  }),
)
function UpdateLastActivityTime(sessionId: string) {
  const session = sessions.get(sessionId)
  if (!session) {
    return
  }
  sessions.set(sessionId, {
    ...session,
    lastActivityTime: new Date(),
  })
}
function invalidateOldSessions() {
  const now = Date.now()
  for (const [sessionId, obj] of sessions.entries()) {
    const EXPIRATION_TIME = (1 * 60) * 60 * 1000
    // obj.lastActivityTimeをミリ秒単位の数値に変換
    const lastActivityTimeMs = obj.lastActivityTime.getTime()
    if (now - lastActivityTimeMs > EXPIRATION_TIME) {
      // セッションを無効にする
      sessions.delete(sessionId)
    }
  }
}
setInterval(invalidateOldSessions, 5 * 60 * 1000)

export default app
await subscribeMessage(redisch)
