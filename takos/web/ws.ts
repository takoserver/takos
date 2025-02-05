import { upgradeWebSocket } from "hono/deno";
import app from "../userInfo.ts";
import { WSContext } from "hono/ws";
import redis from "redis";
import { load } from "@std/dotenv";
import Session from "../models/sessions.ts";
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
      for (const user of users) {
        if (user.includes("@") === false) {
          return;
        }
        if (user.split("@")[1] !== env["domain"]) {
          return;
        }
        const sessionids = (await Session.find({
          userName: user.split("@")[0],
        })).map((session) => session.sessionid);
        for (const sessionid of sessionids) {
          const ws = sessions.get(sessionid);
          if (ws) {
            console.log("send message");
            ws.ws.send(JSON.stringify({
              type: "message",
              data: message,
            }));
          }
        }
      }
    }
  });
}
const sessions = new Map<
  string,
  { ws: WSContext; subGroup: string; userId: string }
>();
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
        const session = c.get("session");
        if (!user || !session) {
          ws.close();
          return;
        }
        sessions.set(session.sessionid, {
          ws,
          subGroup: "",
          userId: user.userName + "@" + env["domain"],
        });
      },
      onMessage: (evt) => {
        const session = c.get("session");
        if (!session) return;
        const ws = sessions.get(session.sessionid);
        if (!ws) return;
        if (typeof evt.data !== "string") {
          return;
        }
        const data: {
          type: string;
          data: string;
        } = JSON.parse(evt.data);
        if (data.type === "subGroup") {
          ws.subGroup = data.data;
          sessions.set(session.sessionid, {
            ws: ws.ws,
            subGroup: data.data,
            userId: ws.userId,
          });
        }
      },
    };
  }),
);

export default app;
