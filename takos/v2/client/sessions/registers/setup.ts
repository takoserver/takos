import { Hono } from "hono";
import * as imagescript from "imagescript";
import { checkNickName } from "@/utils/checks.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import user from "@/models/user.ts";
import {
  verifyAccountKey,
  verifyDeviceKey,
  verifyIdentityKey,
} from "takosEncryptInk";
import type {
  MasterKeyPub,
  IdentityKeyPub,
  AccountKeyPub,
  deviceKey,
 } from "takosEncryptInk";
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
    age,
    account_key,
    device_key,
    identity_key,
    master_key,
  }: {
    nickName: string;
    icon: string;
    recpatcha: string;
    age: number;
    account_key: AccountKeyPub;
    identity_key: IdentityKeyPub;
    master_key: MasterKeyPub;
    device_key: deviceKey;
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
  if (!age) {
    return c.json({ status: false, error: "age is not found" }, {
      status: 500,
    });
  }
  if (!account_key) {
    return c.json({ status: false, error: "account_key is not found" }, {
      status: 500,
    });
  }
  if (!device_key) {
    return c.json({ status: false, error: "device_key is not found" }, {
      status: 500,
    });
  }
  const identityVerify = verifyIdentityKey(master_key, identity_key);
  if (!identityVerify) {
    return c.json({ status: false, error: "invalid identity key" }, {
      status: 500,
    });
  }
  const accountVerify = verifyAccountKey(identity_key, account_key);
  if (!accountVerify) {
    return c.json({ status: false, error: "invalid account key" }, {
      status: 500,
    });
  }
  const deviceVerify = verifyDeviceKey(master_key, device_key);
  if (!deviceVerify) {
    return c.json({ status: false, error: "invalid device key" }, {
      status: 500,
    });
  }
  return c.json({ status: true });
});

export default app;
