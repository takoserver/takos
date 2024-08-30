import { Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import Sessionid from "@/models/sessionid.ts";
import User from "@/models/users.ts";
import {
  type AccountKeyPub,
  type deviceKey,
  type EncryptedDataKeyShareKey,
  generateKeyHashHexJWK,
  type IdentityKeyPub,
  isValidAccountKey,
  isValidIdentityKeySign,
  isValidKeyShareKey,
  type KeyShareKeyPub,
  type MasterKeyPub,
} from "takosEncryptInk";
import Keys from "@/models/keys/keys.ts";
const app = new Hono();

app.post("/", async (c: Context) => {
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
  const userInfo = await User.findOne({ userName: session.userName });
  if (!userInfo) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    return c.json({ status: false }, 400);
  }
  const {
    account_key,
    identity_key,
    master_key,
    device_key,
    keyShareKey,
    encryptedIdentityKey,
    encryptedAccountKey,
  }: {
    account_key: AccountKeyPub;
    identity_key: IdentityKeyPub;
    master_key: MasterKeyPub;
    device_key: deviceKey;
    keyShareKey: KeyShareKeyPub;
    encryptedIdentityKey: EncryptedDataKeyShareKey;
    encryptedAccountKey: EncryptedDataKeyShareKey;
  } = body;
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
  await User.updateOne({ userName: session.userName }, {
    $set: {
      masterKey: master_key,
      setup: true,
      keyShareKey,
    },
  });
  await Keys.deleteMany({ userName: session.userName });
  await Sessionid.deleteMany({
    userName: session.userName,
    sessionid: { $ne: session.sessionid },
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
  console.log("resetKey success");
  return c.json({ status: true }, 200);
});

export default app;
