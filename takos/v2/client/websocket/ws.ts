import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import User from "../../../models/users.ts";
import Session from "../../../models/sessions.ts";
import { WSContext } from "hono/ws";
import pubClient from "../../../utils/pubClient.ts";
import env from "../../../utils/env.ts";
import redis from "redis";
import MigrateData from "../../../models/migrateData.ts";
const redisURL = env["REDIS_URL"];
const redisch = env["REDIS_CH"];
const subClient = redis.createClient({
  url: redisURL,
});
const app = new Hono();
await subClient.connect();
async function subscribeMessage(channel: string | string[]) {
  await subClient.subscribe(channel, async (message) => {
    const data: {
      type: string;
      data: any;
    } = JSON.parse(message);
    switch (data.type) {
      case "requestMigrateSignKey": {
        const query: {
          userName: string;
          migrateid: string;
        } = data.data;
        const sessionInfo = Array.from(session.entries())
          .find(([_, value]) =>
            value.userName === query.userName && value.encrypted
          )?.[1];
        if (!sessionInfo) {
          return;
        }
        sessionInfo.ws.send(JSON.stringify({
          type: "requestMigrateSignKey",
          data: {
            migrateid: query.migrateid,
          },
        }));
        break;
      }

      case "noticeMigrateSignKey": {
        const query: {
          sessionid: string;
          migrateid: string;
        } = data.data;
        const sessionInfo = Array.from(session.entries()).find(([_, value]) =>
          value.sessionid === query.sessionid
        );
        if (!sessionInfo) {
          return;
        }
        const migrateData = await MigrateData.findOne({
          migrateid: query.migrateid,
        });
        if (!migrateData) {
          return;
        }
        sessionInfo[1].ws.send(JSON.stringify({
          type: "noticeMigrateSignKey",
          data: {
            migrateid: query.migrateid,
            migrateSignKey: migrateData.migrateSignKey,
          },
        }));
        break;
      }
      case "noticeSendMigrateData": {
        //requestSendDataの送信をリクエスト
        const query: {
          sessionid: string;
          migrateid: string;
        } = data.data;
        const sessionInfo = Array.from(session.entries()).find(([_, value]) =>
          value.sessionid === query.sessionid
        );
        if (!sessionInfo) {
          return;
        }
        const migrateData = await MigrateData.findOne({
          migrateid: query.migrateid,
        });
        if (!migrateData) {
          return;
        }
        sessionInfo[1].ws.send(JSON.stringify({
          type: "noticeSendMigrateData",
          data: {
            migrateid: query.migrateid,
            migrateData: migrateData.migrateData,
            sign: migrateData.sign,
          },
        }));
        break;
      }
    }
  });
}

const session = new Map<string, {
  ws: WSContext<WebSocket>;
  sessionid: string;
  userName: string;
  encrypted: boolean;
}>();

await subscribeMessage(redisch);
export default app;

app.get(
  "/",
  upgradeWebSocket((c) => {
    return {
      onOpen: (event, ws) => {
        async function run() {
          const sessionid = c.req.query("sessionid");
          if (!sessionid) {
            ws.close();
            return;
          }
          const user = await Session.findOne({ sessionid: sessionid });
          if (!user) {
            ws.close();
            return;
          }
          const wsSession = crypto.getRandomValues(new Uint32Array(1))[0]
            .toString(16);
          session.set(wsSession, {
            ws,
            sessionid,
            userName: user.userName,
            encrypted: user.encrypted,
          });
          ws.send(JSON.stringify({
            type: "session",
            sessionid: wsSession,
          }));
        }
        run();
      },
      onMessage: (event, ws) => {
        const dataString = event.data.toString();
        const data: {
          type: string;
          sessionid: string;
          data: any;
        } = JSON.parse(dataString);
        const sessionData = session.get(data.sessionid);
        if (!sessionData) {
          return;
        }
      },
      onClose: (event, ws) => {
        const sessionData = Array.from(session.entries()).find(([_, value]) =>
          value.ws === ws
        );
        if (!sessionData) {
          return;
        }
        session.delete(sessionData[0]);
      },
    };
  }),
);
