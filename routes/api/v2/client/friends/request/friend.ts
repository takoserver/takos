import takos from "../../../../../../util/takos.ts";
import userConfig from "../../../../../../models/userConfig.ts";
import requestAddFriend from "../../../../../../models/reqestAddFriend.ts";
import { load } from "$std/dotenv/mod.ts";
const env = await load();
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: false, message: "Not Logged In" }));
    }
    const userid = ctx.state.data.userid;
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ status: false, message: "Invalid request" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const { userName, csrftoken } = body;
    if (typeof userName !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid userName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof csrftoken !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid csrftoken" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkUserName(userName) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (await takos.checkCsrfToken(csrftoken, userid) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid CSRF token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const userDomain = takos.splitUserName(userName).domain;
    if (userDomain !== env["DOMAIN"]) {
      //他のドメインのユーザーにリクエストを送る場合
      return;
    } else {
      //自分のドメインのユーザーにリクエストを送る場合
    }
  },
};
