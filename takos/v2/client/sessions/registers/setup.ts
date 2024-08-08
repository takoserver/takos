import { Hono } from "hono";
import * as imagescript from "imagescript";
import { checkNickName } from "@/utils/checks.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import user from "@/models/user.ts";
import takosEncryptInk from "takosEncryptInk";
import { checkRecapcha } from "@/utils/checkRecapcha.ts";
import User from "@/models/user.ts";
const app = new Hono();

app.post("/", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    console.log(e);
    return c.json({ status: false, error: "faild to load image" }, {
      status: 500,
    });
  }
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
  const user = await User.findOne({ uuid: session.uuid });
  if (!user) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  const {
    nickName,
    icon,
    recpatcha,
    recpatchaKind,
    age,
    account_sign_key,
    account_encript_key,
    device_key,
  }: {
    nickName: string;
    icon: string;
    recpatcha: string;
    age: number;
    account_sign_key: string;
    account_encript_key: string;
    device_key: string;
    recpatchaKind: "v2" | "v3";
  } = body;
  if (!checkNickName(nickName)) {
    return c.json({ status: false, error: "invalid nickname" }, {
      status: 500,
    });
  }
  if (!icon) {
    return c.json({ status: false, error: "icon is not found" }, {
      status: 500,
    });
  }
  if (!recpatcha) {
    return c.json({ status: false, error: "recaptcha is not found" }, {
      status: 500,
    });
  }
  if (!age) {
    return c.json({ status: false, error: "age is not found" }, {
      status: 500,
    });
  }
  if (!account_sign_key) {
    return c.json({ status: false, error: "account_sign_key is not found" }, {
      status: 500,
    });
  }
  if (!account_encript_key) {
    return c.json(
      { status: false, error: "account_encript_key is not found" },
      {
        status: 500,
      },
    );
  }
  if (!device_key) {
    return c.json({ status: false, error: "device_key is not found" }, {
      status: 500,
    });
  }
  if (!await checkRecapcha(recpatcha, recpatchaKind)) {
    return c.json({ status: false, error: "invalid recapcha" }, {
      status: 400,
    });
  }
  const iconBuffer = takosEncryptInk.base64ToArrayBuffer(icon);
  const iconUint8Array = new Uint8Array(iconBuffer); // ArrayBufferをUint8Arrayに変換
  if (age < 0 || age > 120) {
    return c.json({ status: false, error: "invalid age" }, {
      status: 500,
    });
  }
  try {
    const accountEnscriptKey = await takosEncryptInk.importKeyFromPem(
      account_encript_key,
      "accountEnscriptKey",
      "publicKey",
    );
    const accountSignKey = await takosEncryptInk.importKeyFromPem(
      account_sign_key,
      "accountSignKey",
      "publicKey",
    );
    const deviceKey = await takosEncryptInk.importKeyFromPem(
      device_key,
      "deviceKey",
      "private",
    );
    const accountEnscriptPem = await takosEncryptInk.exportKeyToPem(
      accountEnscriptKey,
      "accountEnscriptKey",
      "publicKey",
    );
    const accountSignPem = await takosEncryptInk.exportKeyToPem(
      accountSignKey,
      "accountSignKey",
      "publicKey",
    );
    const devicePem = await takosEncryptInk.exportKeyToPem(
      deviceKey,
      "deviceKey",
      "private",
    );

    await User.updateOne({ uuid: user.uuid }, {
      nickName: nickName,
      icon: iconUint8Array,
      age: age,
      accountEnscriptKey: accountEnscriptPem,
      accountSignKey: accountSignPem,
      deviceKey: devicePem,
      setup: true,
    });
    return c.json({ status: true });
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return c.json({ status: false, error: "invalid key" }, {
      status: 500,
    });
  }
});

export default app;
