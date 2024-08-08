import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import User from "@/models/user.ts";
import Sessionid from "@/models/sessionid.ts";
import takosEncryptInk from "takosEncryptInk";

const app = new Hono();

app.get("/", async (c) => {
  const sessionid = getCookie(c, "sessionid");
  if (!sessionid) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 500,
    });
  }
  const session = await Sessionid.findOne({ sessionid: sessionid });
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 500,
    });
  }
  const userInfo = await User.findOne({ uuid: session.uuid });
  if (!userInfo) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  let icon: Uint8Array;
  try {
    icon = await Deno.readFile("./files/userIcon/" + userInfo.uuid + ".jpg");
  } catch (error) {
    icon = await Deno.readFile("./people.jpeg");
  }
  const iconBase64 = takosEncryptInk.ArrayBuffertoBase64(icon);
  return c.json({
    status: true,
    data: {
        userName: userInfo.userName,
        nickName: userInfo.nickName,
        icon: iconBase64,
        age: userInfo.age,
        device_key: userInfo.deviceKey,
    }
  },200);
});

export default app;