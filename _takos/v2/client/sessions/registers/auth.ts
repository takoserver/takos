import { Context, Hono } from "hono";
import { checkEmail } from "@/utils/checkEmail.ts";
import { checkRecapcha } from "@/utils/checkRecapcha.ts";
import tempUsers from "@/models/tempUser.ts";
import { checkPassword, checkUserName } from "@/utils/checks.ts";
import user from "../../../../models/users.ts";
const app = new Hono();
app.post("/", async (c: Context) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    console.log(e);
    return c.json({ status: false, error: "faild to load image" }, {
      status: 500,
    });
  }
  const { userName, password, email, recapcha, recapchaKind, token } = body;
  const sessionid = token;
  if (
    !userName || !password || !email || !recapcha || !recapchaKind || !sessionid
  ) {
    console.log(userName, password, email, recapcha, recapchaKind, sessionid);
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (!checkEmail(email)) {
    return c.json({ status: false, error: "invalid email" }, { status: 400 });
  }
  if (!await checkRecapcha(recapcha, recapchaKind)) {
    return c.json({ error: "invalid recapcha" }, { status: 400 });
  }
  const tempUser = await tempUsers.findOne({ email, token: sessionid });
  if (!tempUser) {
    return c.json({ status: false, error: "invalid token" }, { status: 400 });
  }
  if (!tempUser.checked) {
    return c.json({ status: false, error: "認証しろ" }, { status: 400 });
  }
  if (checkPassword(password) === false) {
    return c.json({ status: false, error: "invalid password" }, {
      status: 400,
    });
  }
  if (checkUserName(userName) === false) {
    return c.json({ status: false, error: "invalid userName" }, {
      status: 400,
    });
  }
  //ユーザー名がかぶっていないか確認
  const userNameUser = await user.findOne({
    userName: userName,
  });
  if (userNameUser !== null) {
    return c.json({ status: false, error: "Already Registered" }, {
      status: 400,
    });
  }
  //メールアドレスがかぶっていないか確認
  const emailUser = await user.findOne({
    email: email,
  });
  if (emailUser !== null) {
    return c.json({ status: false, error: "Already Registered" }, {
      status: 400,
    });
  }
  await tempUsers.deleteOne({
    email: email,
  });
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const salt = Array.from(
    array,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
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
  await user.create({
    userName,
    email,
    password: hashHex,
    salt: salt,
  });
  return c.json({ status: true }, { status: 200 });
});
export default app;
