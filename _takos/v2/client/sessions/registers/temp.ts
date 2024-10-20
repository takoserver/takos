import { Context, Hono } from "hono";
import tempUsers from "@/models/tempUser.ts";
import User from "../../../../models/users.ts";
import { checkEmail } from "@/utils/checkEmail.ts";
import { checkRecapcha } from "@/utils/checkRecapcha.ts";
import { generateRandom16DigitNumber } from "@/utils/randomNumbers.ts";
import { createSessionid } from "@/utils/createSessionid.ts";
import { sendMail } from "@/utils/sendEmail.ts";
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
  const { email, recapcha, recapchaKind } = body;
  if (!email || !recapcha || !recapchaKind) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (!checkEmail(email)) {
    console.log(email);
    return c.json({ status: false, error: "invalid email" }, { status: 400 });
  }
  if (!await checkRecapcha(recapcha, recapchaKind)) {
    return c.json({ status: false, error: "invalid recapcha" }, {
      status: 400,
    });
  }
  const user = await User.findOne({ email });
  if (user) {
    return c.json({ status: false, error: "email already exists" }, {
      status: 400,
    });
  }
  const randomNumber = generateRandom16DigitNumber();
  const sessionid = createSessionid();
  const tempUser = await tempUsers.findOne({ email });
  if (tempUser !== null) {
    await tempUsers.updateOne({ email }, {
      $set: {
        checkCode: randomNumber,
        token: sessionid,
        checked: false,
      },
    });
  } else {
    await tempUsers.create({
      email: email,
      checkCode: randomNumber,
      token: sessionid,
    });
  }
  sendMail(
    email,
    "認証コード",
    `以下のtokenを張り付けてメールアドレスを認証してください.\ntoken: ${randomNumber}`,
  );
  return c.json({ token: sessionid, status: true });
});
export default app;
