import { Context, Hono } from "hono";
import { checkRecapcha } from "@/utils/checkRecapcha.ts";
import tempUsers from "@/models/tempUser.ts";
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
  const { code, email, recpacha, recpachaKind, token } = body;
  if (!code || !email || !recpacha || !recpachaKind || !token) {
    console.log(code, email, recpacha, recpachaKind, token);
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (!await checkRecapcha(recpacha, recpachaKind)) {
    return c.json({ status: false, error: "invalid recapcha" }, {
      status: 400,
    });
  }
  const tempUser = await tempUsers.findOne({ email, token });
  if (!tempUser) {
    return c.json({ status: false, error: "invalid token" }, { status: 400 });
  }
  if (tempUser.checkCode != code) {
    console.log(tempUser.checkCode, code);
    return c.json({ status: false, error: "invalid code" }, { status: 400 });
  }
  await tempUsers.updateOne({ email, token }, { $set: { checked: true } });
  return c.json({ status: true }, { status: 200 });
});
export default app;
