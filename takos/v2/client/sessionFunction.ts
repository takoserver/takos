import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import KeyShareData from "../../models/keyShareData.ts";
import Keys from "../../models/keys.ts";
import pubClient from "../../utils/pubClient.ts";
import {
  isValidAccountPublicKey,
  isValidIdentityPublicKey,
  isValidKeyShareKeyPublic,
  isValidkeyShareSignKeyPublic,
  isValidMasterKeyPub,
  isValidmigrateKeyPublic,
  isValidmigrateSignKeyyPublic,
  keyHash,
  verifyDataIdentityKey,
  verifyDataMasterKey,
} from "@takos/takos-encrypt-ink";

import { decode, Image } from "imagescript";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../../utils/buffers.ts";
import { checkNickName } from "../../utils/checks.ts";
import MigrateData from "../../models/migrateData.ts";

const singlend = new Singlend();

singlend.group(
  z.object({
    sessionid: z.string(),
  }),
  async (query, next, error) => {
    const user = await Session.findOne({ sessionid: query.sessionid });
    if (!user) {
      return error("NotLogin", 401);
    }
    const userInfo = await User.findOne({ userName: user.userName });
    if (!userInfo) {
      return error("error", 500);
    }
    return next({ userInfo: userInfo, sessionInfo: user });
  },
  (singlend) => {
    singlend.on(
      "getSessionInfo",
      z.object({}),
      async (query, value, ok) => {
        const SharedData = await KeyShareData.find({
          sessionid: value.sessionInfo.sessionid,
        });
        return ok({
          setuped: value.userInfo.setup,
          sessionEncrypted: value.sessionInfo.encrypted,
          sharedDataIds: SharedData.map((data) => data.id),
          deviceKey: value.sessionInfo.deviceKey,
        });
      },
    );
    singlend.on(
      "setUp",
      z.object({
        masterKey: z.string(),
        identityKey: z.string(),
        accountKey: z.string(),
        nickName: z.string(),
        icon: z.string(),
        birthday: z.string(),
        keyShareKey: z.string(),
        keyShareSignKey: z.string(),
        identityKeySign: z.string(),
        accountKeySign: z.string(),
        keyShareKeySign: z.string(),
        keyShareSignKeySign: z.string(),
        sessionUUID: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.userInfo.setup) return error("error setup", 400);
        console.log(
          isValidMasterKeyPub(query.masterKey),
          isValidIdentityPublicKey(query.identityKey),
          isValidAccountPublicKey(query.accountKey),
          isValidKeyShareKeyPublic(query.keyShareKey),
          isValidkeyShareSignKeyPublic(query.keyShareSignKey),
        );
        if (
          !isValidMasterKeyPub(query.masterKey) ||
          !isValidIdentityPublicKey(query.identityKey) ||
          !isValidAccountPublicKey(query.accountKey) ||
          !isValidKeyShareKeyPublic(query.keyShareKey) ||
          !isValidkeyShareSignKeyPublic(query.keyShareSignKey)
        ) return error("error Valid", 400);
        if (
          !verifyDataMasterKey(
            query.identityKey,
            query.masterKey,
            query.identityKeySign,
          ) ||
          !verifyDataIdentityKey(
            query.accountKey,
            query.identityKey,
            query.accountKeySign,
          ) ||
          !verifyDataMasterKey(
            query.keyShareKey,
            query.masterKey,
            query.keyShareKeySign,
          ) ||
          !verifyDataMasterKey(
            query.keyShareSignKey,
            query.masterKey,
            query.keyShareSignKeySign,
          )
        ) return error("error verify", 400);
        if (!isValidUUIDv7(query.sessionUUID)) return error("error UUID", 400);
        if (!checkNickName(query.nickName)) return error("error nickName", 400);
        if (new Date(query.birthday) > new Date()) {
          return error("error birthday", 400);
        }
        await Session.updateOne({ sessionid: value.sessionInfo.sessionid }, {
          encrypted: true,
          sessionUUID: query.sessionUUID,
          keyShareKey: query.keyShareKey,
          keyShareSignKey: query.keyShareSignKey,
          keyShareSignSing: query.keyShareSignKeySign,
          keyShareSing: query.keyShareKeySign,
        });
        await User.updateOne({ userName: value.userInfo.userName }, {
          setup: true,
          masterKey: query.masterKey,
          icon: await resizeImage(query.icon),
          nickName: query.nickName,
          birthday: new Date(query.birthday),
        });
        const keyHashResult = await keyHash(query.identityKey);
        const idenTImestamp = (JSON.parse(query.identityKey)).timestamp;
        await Keys.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKey,
          accountKey: query.accountKey,
          keyHash: keyHashResult,
          timestamp: idenTImestamp,
        });
        return ok("ok");
      },
    );
    singlend.on(
      "requestMigrate",
      z.object({
        migrateKey: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.sessionInfo.encrypted) return error("error", 400);
        if (!isValidmigrateKeyPublic(query.migrateKey)) {
          return error("error", 400);
        }
        const sessionid = value.sessionInfo.sessionid;
        //migrateidを生成
        const migrateid = crypto.getRandomValues(new Uint32Array(1))[0]
          .toString(16);
        await MigrateData.create({
          migrateid,
          migrateKey: query.migrateKey,
          requesterSessionid: sessionid,
        });
        pubClient(JSON.stringify({
          type: "requestMigrateSignKey",
          data: {
            userName: value.userInfo.userName,
            migrateid,
          },
        }));
        return ok({ migrateid });
      },
    );
    singlend.on(
      "acceptMigrate",
      z.object({
        migrateSignKey: z.string(),
        migrateid: z.string(),
      }),
      async (query, value, ok, error) => {
        if (!value.sessionInfo.encrypted) return error("error1", 400);
        const migrateData = await MigrateData.findOne({
          migrateid: query.migrateid,
        });
        if (!migrateData) return error("error2", 400);
        if (migrateData.accept) return error("error3", 400);
        if (!isValidmigrateSignKeyyPublic(query.migrateSignKey)) {
          return error("error4", 400);
        }
        await MigrateData.updateOne({ migrateid: query.migrateid }, {
          migrateSignKey: query.migrateSignKey,
          accept: true,
          accepterSessionid: value.sessionInfo.sessionid,
        });
        pubClient(JSON.stringify({
          type: "noticeMigrateSignKey",
          data: {
            sessionid: migrateData.requesterSessionid,
            migrateid: query.migrateid,
          },
        }));
        return ok({
          migrateKey: migrateData.migrateKey,
        });
      },
    );
    singlend.on(
      "sendMigrateData",
      z.object({
        migrateid: z.string(),
        migrateData: z.string(),
        sign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (!value.sessionInfo.encrypted) return error("error1", 400);
        const migrateData = await MigrateData.findOne({
          migrateid: query.migrateid,
        });
        if (!migrateData) return error("error2", 400);
        if (!migrateData.accept) return error("error3", 400);
        if (migrateData.sended) return error("error4", 400);
        if (migrateData.accepterSessionid !== value.sessionInfo.sessionid) {
          return error("error5", 400);
        }
        await MigrateData.updateOne({ migrateid: query.migrateid }, {
          migrateData: query.migrateData,
          sign: query.sign,
          sended: true,
        });
        pubClient(JSON.stringify({
          type: "noticeSendMigrateData",
          data: {
            sessionid: migrateData.requesterSessionid,
            migrateid: query.migrateid,
          },
        }));
        return ok("ok");
      },
    );
    singlend.on(
      "encryptSession",
      z.object({
        keyShareKey: z.string(),
        keyShareSignKey: z.string(),
        keyShareSignKeySign: z.string(),
        keyShareKeySign: z.string(),
        sessionUUID: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.sessionInfo.encrypted) return error("error", 400);
        if (
          !isValidKeyShareKeyPublic(query.keyShareKey) ||
          !isValidkeyShareSignKeyPublic(query.keyShareSignKey)
        ) return error("error", 400);
        if (!isValidUUIDv7(query.sessionUUID)) return error("error", 400);
        const masterKey = value.userInfo.masterKey;
        if(!masterKey) return error("error", 400);
        if (
          !verifyDataMasterKey(
            query.keyShareKey,
            masterKey,
            query.keyShareKeySign,
          ) ||
          !verifyDataMasterKey(
            query.keyShareSignKey,
            masterKey,
            query.keyShareSignKeySign,
          )
        ) return error("error", 400);

        await Session.updateOne({ sessionid: value.sessionInfo.sessionid }, {
          encrypted: true,
          sessionUUID: query.sessionUUID,
          keyShareKey: query.keyShareKey,
          keyShareSignKey: query.keyShareSignKey,
          keyShareSignSing: query.keyShareSignKeySign,
          keyShareSing: query.keyShareKeySign,
        });
        return ok("ok");
      },
    )
    singlend.on(
      "getKeyShareKeys",
      z.object({}),
      async (_query, value, ok) => {
        const sessionDatas = await Session.find({
          encrypted: true,
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid }
        });
        const result = sessionDatas.map((data) => {
          return {
            keyShareKey: data.keyShareKey,
            keyShareSignKey: data.keyShareSignKey,
            keyShareSignKeySign: data.keyShareSignSing,
            keyShareKeySign: data.keyShareSing,
            sessionUUID: data.sessionUUID,
          };
        });
        return ok(result);
      },
    )
    return singlend;
  },
);

export default singlend;

function isValidUUIDv7(uuid: string): boolean {
  const uuidV7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV7Regex.test(uuid);
}

async function resizeImage(icon: string) {
  const imageArrayBuffer = base64ToArrayBuffer(icon);
  const image = await Image.decode(new Uint8Array(imageArrayBuffer));
  const resizedImage = image.resize(256, 256);
  const resizedImageArrayBuffer = await resizedImage.encodeJPEG();
  return arrayBufferToBase64(resizedImageArrayBuffer);
}
