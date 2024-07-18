//メールアドレスによる仮登録
// POST /api/v2/client/sessions/registers/temp
// { email: string, recaptcha: string }
// -> { status: boolean, message: string, token: string }
import takos from "../../../../../../util/takos.ts";
import tempUsers from "../../../../../../models/tempUsers.ts";
import users from "../../../../../../models/users.ts";
import { sendMail } from "../../../../../../util/takoFunction.ts";
import { load } from "$std/dotenv/mod.ts";
import * as mod from "$std/crypto/mod.ts";
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
    const recaptcha = body.recaptcha;
    const recaptchakind = body.recaptchakind;
    if (typeof email !== "string") {
      return new Response(JSON.stringify({ status: false, message: "Invalid email" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkEmail(email) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid email" }), {
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
      const RECAPTCHA_SECRET_KEY = env["rechapcha_seecret_key_v3"]
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
      const RECAPTCHA_SECRET_KEY = env["rechapcha_seecret_key_v2"]
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
    const randomNumber = takos.generateRandom16DigitNumber();
    //すでに登録されているユーザーかどうかを確認
    const user = await users.findOne({
      mail: email,
    });
    if (user !== null) {
      return new Response(JSON.stringify({ status: false, message: "Already Registered" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    //データーベースに仮登録情報を保存 すでに登録されている場合は更新
    const sessionid = takos.createSessionid();
    const tempUser = await tempUsers.findOne({
      mail: email,
    });
    if (tempUser === null) {
      if (!email || !randomNumber || !sessionid) {
        return new Response(JSON.stringify({ status: false, message: "Invalid data" }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        });
      }
      await tempUsers.create({
        mail: email,
        checkCode: randomNumber,
        token: sessionid,
      });
      console.log("created");
    } else {
      await tempUsers.updateOne({
        mail: email,
      }, {
        $set: {
          checkCode: randomNumber,
          token: sessionid,
          checked: false,
        },
      });
    }
    //仮登録のメールを送信
    sendMail(email, "認証コード", `以下のtokenを張り付けてメールアドレスを認証してください.\ntoken: ${randomNumber}`);
    return new Response(JSON.stringify({ status: true, message: "Sent Mail", token: sessionid }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  },
};
