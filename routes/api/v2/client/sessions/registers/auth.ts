//本登録するapi
//POST /api/v2/client/sessions/registers/auth
// { email: string, password: string, nickName: string,age: string, token: string, recaptcha: string, userName: string}
// -> { status: boolean, message: string }
import { load } from "$std/dotenv/mod.ts";
import tempUsers from "../../../../../../models/tempUsers.ts";
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
const env = await load();
export const handler = {
  async POST(req: Request, ctx: any) {
    if (ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ status: "Already Logged In" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const body = await req.json();
    const { email, password, nickName, age, token, recaptcha, userName } = body;
    if (takos.checkEmail(email) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid email" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkUserName(userName) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid userName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkNickName(nickName) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid nickName" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkAge(age) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid age" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (takos.checkPassword(password) === false) {
      return new Response(JSON.stringify({ status: false, message: "Invalid password" }), {
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
    const isSecsusRechapcha = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${Deno.env.get("RECAPTCHA_SECRET_KEY")}&response=${recaptcha}`,
    );
    const score = await isSecsusRechapcha.json();
    if (score.score < 0.5 || score.success == false) {
      console.log(score);
      return new Response(
        JSON.stringify({ "status": false, error: "rechapcha" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 403,
        },
      );
    }
    const tempUser = await tempUsers.findOne({
      email: email,
      token: token,
    });
    if (tempUser === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (tempUser.checked) {
      return new Response(JSON.stringify({ status: false, message: "Already Registered" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const user = await users.findOne({
      email: email,
    });
    if (user !== null) {
      return new Response(JSON.stringify({ status: false, message: "Already Registered" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    //ユーザー名がかぶっていないか確認
    const userNameUser = await users.findOne({
      userName: userName,
    });
    if (userNameUser !== null) {
      return new Response(JSON.stringify({ status: false, message: "Already Registered" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    //本登録
    await tempUsers.deleteOne({
      email: email,
    });
    //塩を生成
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const salt = Array.from(
      array,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    //パスワードをハッシュ化
    const saltPassword = password + salt;
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(saltPassword),
    );
    const hashArray = new Uint8Array(hash);
    const hashHex = Array.from(
      hashArray,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    //ユーザーを登録
    const uuid = crypto.randomUUID() + "@" + env["serverDomain"];
    await users.create({
      uuid: uuid,
      userName,
      nickName,
      mail: email,
      password: hashHex,
      salt: salt,
      age: age,
    });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
