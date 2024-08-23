import { Context, Hono } from "hono";
import type {
  AccountKeyPub,
  IdentityKeyPub,
  MasterKeyPub,
  OtherUserIdentityKeys,
} from "takosEncryptInk";
import User from "@/models/users.ts";
import { getCookie } from "jsr:@hono/hono@^4.5.3/cookie";
import Sessionid from "@/models/sessionid.ts";
import Keys from "../../../models/keys/keys.ts";

const app = new Hono();

app.get("/", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid");
  const latestAllowedIdentityKey = c.req.query("latestAllowedIdentityKey");
  const onlyOneMasterKey = (() => {
    const string = c.req.query("onlyOneMasterKey");
    if (!string) {
      return false;
    }
    return string === "true";
  })();
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
  const keys = await Keys.find({ userName: userInfo.userName }) as {
    timestamp: Date;
    userName: string;
    identityKey?: IdentityKeyPub;
    accountKey?: AccountKeyPub;
    hashHex?: string;
    hashChain: any[];
  }[];
  keys.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (!onlyOneMasterKey && !latestAllowedIdentityKey) {
    return c.json({
      status: true,
      data: {
        masterKey: userInfo.masterKey,
        keys: keys,
      },
    }, 200);
  }
  if (onlyOneMasterKey) {
    const latestMasterKey = keys[keys.length - 1].identityKey?.sign
      .hashedPublicKeyHex;
    //最新のマスターキー以外のマスターキーを配列から削除する
    return c.json({
      status: true,
      data: {
        masterKey: userInfo.masterKey,
        keys: keys.filter((key) =>
          key.identityKey?.sign.hashedPublicKeyHex === latestMasterKey
        ),
      },
    }, 200);
  }
  if (latestAllowedIdentityKey) {
    //
  }
  c.json({
    status: false,
    error: "invalid query",
  }, {
    status: 500,
  });
});

export default app;
