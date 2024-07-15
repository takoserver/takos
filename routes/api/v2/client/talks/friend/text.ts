//textメッセージを送信する
// POST /api/v2/client/talks/sending/text
// { text: string, sessionid: string, friendid: string, channel: string }
// -> { status: boolean, message: string }
import pubClient from "../../../../../../util/redisClient.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
export const handler = {
  async POST(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "You are not logged in" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return ctx.json({ status: false, message: "Invalid JSON" });
    }
    const message = body.text;
    const sessionid = body.sessionid;
    const channel = env["REDIS_CH"];
    if (typeof message !== "string") {
      console.log(message);
      return new Response(JSON.stringify({ status: false, message: "Invalid message" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof sessionid !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid sessionid" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof channel !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid channel" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    pubClient.publish(channel, JSON.stringify({ type: "textMessage", message: message, sessionid: sessionid }));
    return new Response(JSON.stringify({ status: true, message: "Success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
