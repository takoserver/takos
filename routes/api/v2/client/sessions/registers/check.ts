//メールアドレスに送られた確認コードを認証する
// POST /api/v2/client/sessions/registers/check
// { email: string, code: string, token: string, recaptcha: string }
// -> { status: boolean, message: string }
import { load } from "$std/dotenv/mod.ts";
import * as mod from "$std/crypto/mod.ts";
import tempUsers from "../../../../../../models/tempUsers.ts";
const env = await load();
const secretKey = env["rechapcha_seecret_key"];
export const handler = {
  async POST(req: Request, ctx: any) {
    if (ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Already Logged In" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const body = await req.json();
    const email = body.email;
    const code = body.code;
    const token = body.token;
    const recaptcha = body.recaptcha;
    const recaptchakind = body.recaptchakind;
    if (typeof email !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid email" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof code !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid code" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof token !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (typeof recaptcha !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid recaptcha" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (recaptchakind === "v3") {
      const RECAPTCHA_SECRET_KEY = env["rechapcha_seecret_key_v3"];
      const isSecsusRechapcha = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptcha}`,
      );
      const score = await isSecsusRechapcha.json();
      if (score.score < 0.5 || score.success == false) {
        return new Response(
          JSON.stringify({ "status": false, message: "rechapchav3" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 403,
          },
        );
      }
    } else if (recaptchakind === "v2") {
      const RECAPTCHA_SECRET_KEY = env["rechapcha_seecret_key_v2"];
      const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptcha}`,
      });
      const data = await response.json();
      if (!data.success) {
        return new Response(
          JSON.stringify({ "status": false, message: "rechapchav2" }),
          {
            headers: { "Content-Type": "application/json" },
            status: 403,
          },
        );
      }
    }
    const tempUser = await tempUsers.findOne({
      mail: email,
      token: token,
      checkCode: code,
    });
    if (tempUser === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid code" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    await tempUsers.updateOne({ token: token }, { $set: { checked: true } });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
