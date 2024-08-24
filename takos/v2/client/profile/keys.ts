import { Context, Hono } from "hono";
import {
  AccountKeyPub,
  IdentityKey,
  IdentityKeyPub,
  MasterKeyPub,
  OtherUserIdentityKeys,
  signKeyExpiration,
} from "takosEncryptInk";
import User from "@/models/users.ts";
import { getCookie } from "jsr:@hono/hono@^4.5.3/cookie";
import Sessionid from "@/models/sessionid.ts";
import Keys from "../../../models/keys/keys.ts";

const app = new Hono();

app.get("/", async (c: Context) => {
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
  if (!userInfo || userInfo.setup !== true) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    });
  }
  const keys = await Keys.find({ userName: userInfo.userName })
  keys.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const latestMasterKey = keys[keys.length - 1].identityKeyPub?.sign
      .hashedPublicKeyHex;
    //最新のマスターキー以外のマスターキーを配列から削除する
    const result = {
      status: true,
      data: {
        masterKey: userInfo.masterKey,
          identityKeyAndAccountKey: keys.map((key) => {
            if (key.identityKeyPub?.sign.hashedPublicKeyHex === latestMasterKey) {
              return {
                identityKey: key.encryptedIdentityKey.map((key) => {
                  if(key.sessionid === sessionid) {
                    return key
                  }
                  return undefined
                }).filter((key) => key !== undefined)[0],
                accountKey: key.encryptedAccountKey.map((key) => {
                  if(key.sessionid === sessionid) {
                    return key
                  }
                  return undefined
                }).filter((key) => key !== undefined)[0],
                keyExpiration: key.identityKeyPub?.keyExpiration,
              };
            } else {
              return undefined;
            }
          }).filter((key) => key !== undefined),
      },
    }
    //早い順に並べ替える
    result.data.identityKeyAndAccountKey.sort((a, b) => {
      return new Date(a.keyExpiration).getTime() - new Date(b.keyExpiration).getTime();
    });
    return c.json(result, 200);
});

export default app;