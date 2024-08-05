import { Hono } from "hono";
import * as imagescript from "imagescript";
import { checkNickName } from "@/utils/checks.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import user from "@/models/user.ts";
const app = new Hono();

app.post("/", async (c) => {
  let body;
  try {
    body = await c.req.formData();
  } catch (e) {
    console.log(e);
    return c.json({ status: false, error: "faild to load image" }, {
      status: 500,
    });
  }
  const nickName = body.get("nickName") as string;
  const icon = body.get("icon") as File;
  const age = body.get("age") as unknown as number;
  const csrftoken = body.get("csrftoken");
  const sessionId = getCookie(c, "sessionid");
  if (!sessionId) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  const sessionInfo = await Sessionid.findOne({
    sessionId: sessionId,
  });
  if (!sessionInfo) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  const uuid = sessionInfo.uuid;
  if (!nickName || !icon || !age || !csrftoken) {
    return c.json({ status: false, error: "invalid request" }, { status: 400 });
  }
  if (checkNickName(nickName) === false) {
    return c.json({ status: false, error: "invalid nickName" }, {
      status: 400,
    });
  }
  if (age < 0 || age > 120) {
    return c.json({ status: false, error: "invalid age" }, { status: 400 });
  }
  if (icon instanceof File && icon.size > 1048576) {
    return c.json({ status: false, error: "icon is too large" }, {
      status: 400,
    });
  }
  const arrayBuffer = await icon.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const image = await imagescript.Image.decode(uint8Array);
  const resized = image.resize(256, 256);
  const encoded = await resized.encodeJPEG(100); // 100 is the quality of the JPEG image
  await Deno.writeFile(
    "./files/userIcons/" + uuid +
      ".jpeg",
    encoded,
  );
  await user.updateOne({ uuid }, {
    $set: { nickName: nickName, age: age, setup: true },
  });
});

export default app;
