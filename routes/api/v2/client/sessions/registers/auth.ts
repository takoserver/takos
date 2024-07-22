//本登録するapi
//POST /api/v2/client/sessions/registers/auth
// { email: string, password: string, nickName: string,age: string, token: string, recaptcha: string, userName: string}
// -> { status: boolean, message: string }
import { load } from "$std/dotenv/mod.ts";
import tempUsers from "../../../../../../models/tempUsers.ts";
import users from "../../../../../../models/users.ts";
import takos from "../../../../../../util/takos.ts";
import friends from "../../../../../../models/friends.ts";
import requestAddFriend from "../../../../../../models/reqestAddFriend.ts";
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
    const { email, password, token, recaptcha, userName, recaptchakind } = body;
    console.log(userName);
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
    });
    if (tempUser === null) {
      return new Response(JSON.stringify({ status: false, message: "Invalid token" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!tempUser.checked) {
      return new Response(JSON.stringify({ status: false, message: "You have never checked yet" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
    const user = await users.findOne({
      mail: email,
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
    console.log(userNameUser);
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
      mail: email,
      password: hashHex,
      salt: salt,
    });
    await friends.create({
      user: uuid,
      friends: [],
    });
    await requestAddFriend.create({
      userid: uuid,
      friendRequester: [],
      requestedUser: [],
    });
    return new Response(JSON.stringify({ status: true }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
