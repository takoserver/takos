import { upgradeWebSocket } from 'hono/deno'
import app from '../userInfo.ts'
import { WSContext } from "hono/ws";
import redis from 'redis'
import { load } from '@std/dotenv'
const env = await load()
const redisURL = env["REDIS_URL"];
const redisch = env["REDIS_CH"];
const subClient = redis.createClient({
  url: redisURL,
});
await subClient.connect();
async function subscribeMessage(channel: string | string[]) {
    await subClient.subscribe(channel, async (message: string) => {
        const data: {
            type: string;
            users: string[];
            data: string;
        } = JSON.parse(message);
        if(data.type === "message") {
            const { users, data: message } = data
            users.forEach(user => {
                const ws = sessions.get(user)
                if(ws) {
                    ws.send(message)
                }
            })
        }
    });
  }
const sessions = new Map<string, WSContext>()
await subscribeMessage(redisch);

app.get(
    '/',
    upgradeWebSocket((c) => {
      const user = c.get('user')
      const sessions = c.get('sessions')
      if (!user || !sessions) {
        throw new Error('Unauthorized')
      }
      return {
        onClose: () => {
            sessions.delete(user.userName)
        },
        onOpen: (ws) => {
            sessions.set(user.userName, ws)
        }
      }
    })
)

