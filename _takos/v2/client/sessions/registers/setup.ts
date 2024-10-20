import { type Context, Hono } from "hono";
import * as imagescript from "imagescript";
import { checkNickName } from "@/utils/checks.ts";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import {
  base64ToArrayBuffer,
  generateKeyHashHexJWK,
  isValidAccountKey,
  isValidDeviceKey,
  isValidIdentityKeySign,
  isValidKeyShareKey,
} from "takosEncryptInk";
import type {
  AccountKeyPub,
  deviceKey,
  EncryptedDataKeyShareKey,
  IdentityKeyPub,
  KeyShareKeyPub,
  MasterKeyPub,
} from "takosEncryptInk";
import User from "@/models/users.ts";
import Keys from "@/models/keys/keys.ts";
import MasterKey from "@/models/masterKey.ts";
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
  const user = await User.findOne({ userName: session.userName });
  if (!user) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  if (user.setup) {
    return c.json({ status: false, error: "already setup" }, {
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
    keyShareKey,
    encryptedIdentityKey,
    encryptedAccountKey,
  }: {
    nickName: string;
    icon: string;
    recpatcha: string;
    age: number;
    account_key: AccountKeyPub;
    identity_key: IdentityKeyPub;
    master_key: MasterKeyPub;
    device_key: deviceKey;
    keyShareKey: KeyShareKeyPub;
    encryptedIdentityKey: EncryptedDataKeyShareKey;
    encryptedAccountKey: EncryptedDataKeyShareKey;
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
  const identityVerify = isValidIdentityKeySign(master_key, identity_key);
  if (!identityVerify) {
    return c.json({ status: false, error: "invalid identity key" }, {
      status: 500,
    });
  }
  const accountVerify = isValidAccountKey(identity_key, account_key);
  if (!accountVerify) {
    return c.json({ status: false, error: "invalid account key" }, {
      status: 500,
    });
  }
  const verifyKeyShareKey = isValidKeyShareKey(master_key, keyShareKey);
  if (!verifyKeyShareKey) {
    return c.json({ status: false, error: "invalid key share key" }, {
      status: 500,
    });
  }
  try {
    const iconArrayBuffer = base64ToArrayBuffer(icon);
    const iconImage = await imagescript.decode(new Uint8Array(iconArrayBuffer));
    //250x250
    iconImage.resize(250, 250);
    const iconImageResizedBuffer = await iconImage.encode();
    await Deno.writeFile(
      `./files/userIcon/${user.userName}.jpeg`,
      iconImageResizedBuffer,
    );
  } catch (e) {
    console.log(e);
    return c.json({ status: false, error: "faild to load image" }, {
      status: 500,
    });
  }
  await User.updateOne({ userName: session.userName }, {
    $set: {
      nickName,
      age,
      setup: true,
    },
  });
  await MasterKey.create({
    userName: session.userName,
    masterKey: master_key,
    hashHex: await generateKeyHashHexJWK(master_key),
  });
  await Keys.create({
    userName: session.userName,
    identityKeyPub: identity_key,
    accountKeyPub: account_key,
    hashHex: await generateKeyHashHexJWK(identity_key),
    encryptedAccountKey: [{
      key: encryptedAccountKey,
      sessionid: session.sessionid,
    }],
    encryptedIdentityKey: [{
      key: encryptedIdentityKey,
      sessionid: session.sessionid,
    }],
  });
  await Sessionid.updateOne({ sessionid: session.sessionid }, {
    $set: {
      deviceKey: device_key,
      keyShareKeyPub: keyShareKey,
    },
  });
  return c.json({ status: true });
});

export default app;
