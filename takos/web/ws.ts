import { upgradeWebSocket } from "hono/deno";
import app from "../userInfo.ts";
import { WSContext } from "hono/ws";
import redis from "redis";
import { load } from "@std/dotenv";
const env = await load();
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
    if (data.type === "message") {
      const { users, data: message } = data;
      users.forEach((user) => {
        const ws = sessions.get(user);
        if (ws) {
          ws.send(JSON.stringify({
            type: "message",
            data: message,
          }));
        }
      });
    }
  });
}
const sessions = new Map<string, WSContext>();
await subscribeMessage(redisch);

app.get(
  "/",
  upgradeWebSocket((c) => {
    return {
      onClose: () => {
        const user = c.get("user");
        sessions.delete(user.userName);
      },
      onOpen: (evt, ws) => {
        const user = c.get("user");
        if (!user) {
          ws.close();
          return;
        }
        sessions.set(user.userName + "@" + env["domain"], ws);
      },
    };
  }),
);

export default app;
