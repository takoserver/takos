import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import KeyShareData from "../../models/keyShareData.ts";
import Keys from "../../models/keys.ts";
import pubClient from "../../utils/pubClient.ts";
import { uuidv7 } from "uuidv7";
import {
  isValidAccountPublicKey,
  isValidIdentityPublicKey,
  isValidKeyShareKeyPublic,
  isValidkeyShareSignKeyPublic,
  isValidMasterKeyPub,
  isValidmigrateKeyPublic,
  isValidmigrateSignKeyyPublic,
  isValidSign,
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
import Key from "../../models/keys.ts";
import { splitUserName } from "../../utils/utils.ts";
import env from "../../utils/env.ts";
import { requesterServer } from "../../utils/requesterServer.ts";
import requestDB from "../../models/request.ts";
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
          userName: value.userInfo.userName,
          deriveredSession: { $ne: value.sessionInfo.sessionid },
          sessionid: { $ne: value.sessionInfo.sessionid },
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
        if (!masterKey) return error("error", 400);
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
    );
    singlend.on(
      "getKeyShareKeys",
      z.object({}),
      async (_query, value, ok) => {
        const sessionDatas = await Session.find({
          encrypted: true,
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        const result = sessionDatas.map((data) => {
          return {
            keyShareKey: data.keyShareKey,
            sign: data.keyShareSing,
            sessionUUID: data.sessionUUID,
          };
        });
        return ok({
          keySharekeys: result,
        });
      },
    );
    singlend.on(
      "updateIdentityKeyAndAccountKey",
      z.object({
        sharedData: z.array(z.array(z.any())),
        sign: z.string(),
        identityKeyPublic: z.string(),
        accountKeyPublic: z.string(),
      }),
      async (query, value, ok, error) => {
        if (!isValidSign(query.sign)) return error("error1", 400);
        if (
          !isValidIdentityPublicKey(query.identityKeyPublic) ||
          !isValidAccountPublicKey(query.accountKeyPublic)
        ) return error("error2", 400);
        await Keys.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKeyPublic,
          accountKey: query.accountKeyPublic,
          keyHash: await keyHash(query.identityKeyPublic),
          timestamp: (JSON.parse(query.identityKeyPublic)).timestamp,
        });
        const keyShareData: [string, string][] = [];
        for (const data of query.sharedData) {
          const sessionInfo = await Session.findOne({
            sessionUUID: data[0],
          });
          if (!sessionInfo) return error("error3", 400);
          if (!sessionInfo.encrypted) return error("error4", 400);
          if (sessionInfo.userName !== value.userInfo.userName) {
            return error("error5", 400);
          }
          keyShareData.push([data[0], data[1]]);
        }
        await KeyShareData.create({
          id: crypto.getRandomValues(new Uint32Array(1))[0].toString(16),
          userName: value.userInfo.userName,
          sessionid: value.sessionInfo.sessionid,
          EncryptedDataKeyShareKey: keyShareData,
          keyShareSign: query.sign,
          deriveredSession: [],
          timestamp: new Date(),
          type: "key",
        });
        return ok("ok");
      },
    );
    singlend.on(
      "getSharedData",
      z.object({
        id: z.string(),
      }),
      async (query, value, ok, error) => {
        const data = await KeyShareData.findOne({
          id: query.id,
        });
        if (!data) return error("error", 400);
        if (data.userName !== value.userInfo.userName) {
          return error("error", 400);
        }
        const keyShareKey = await Session.findOne({
          sessionid: data.sessionid,
          deriveredSession: { $ne: value.sessionInfo.sessionid },
        });
        if (!keyShareKey) return error("error", 400);
        const keyShareDataIndex = data.EncryptedDataKeyShareKey.findIndex(
          (keyShareData: any) => {
            return keyShareData[0] === value.sessionInfo.sessionUUID;
          },
        );
        if (keyShareDataIndex === -1) return error("error", 400);
        const keyShareData =
          data.EncryptedDataKeyShareKey[keyShareDataIndex][1];
        return ok({
          data: keyShareData as string,
          sign: data.keyShareSign,
          keyShareSignKey: keyShareKey.keyShareSignKey,
          type: data.type,
          keyShareSignKeySign: keyShareKey.keyShareSignSing,
        });
      },
    );
    singlend.on(
      "noticeGetSharedData",
      z.object({
        id: z.string(),
      }),
      async (query, value, ok, error) => {
        const data = await KeyShareData.findOne({
          id: query.id,
        });
        if (!data) return error("error", 400);
        if (data.userName !== value.userInfo.userName) {
          return error("error", 400);
        }
        const keyShareKey = await Session.findOne({
          sessionid: data.sessionid,
          deriveredSession: { $ne: value.sessionInfo.sessionid },
        });
        if (!keyShareKey) return error("error", 400);
        await KeyShareData.updateOne({ id: query.id }, {
          $push: {
            deriveredSession: value.sessionInfo.sessionid,
          }
        });
        return ok("ok");
      },
    );
    singlend.on(
      "getProfile",
      z.object({}),
      (_query, value, ok) => {
        return ok({
          nickName: value.userInfo.nickName,
          icon: value.userInfo.icon,
          birthday: value.userInfo.birthday,
        });
      },
    );
    singlend.on(
      "requestFriend",
      z.object({
        userName: z.string(),
      }),
      async (query, value, ok, error) => {
        const { userName: _userName, domain } = splitUserName(query.userName);
        if(await requestDB.findOne({sender: query.userName, receiver: value.userInfo.userName})) {
          return error("error", 400);
        }
        const requestid = uuidv7() + "@" + env["DOMAIN"]
        if(domain !== env["DOMAIN"]) {
          console.log("requestRemoteServer")
          const requestRemoteServer = await requesterServer(
            domain,
            JSON.stringify({
              type: "requestFriend",
              data: {
                sender: value.userInfo.userName,
                receiver: query.userName,
                uuid: requestid,
              },
            }),
          )
          if(requestRemoteServer.status) {
            await requestDB.create({
              id: requestid,
              sender: value.userInfo.userName,
              receiver: query.userName,
              type: "friendRequest",
              query: "",
            });
            return ok("ok");
          }
          return error("error", 400);
        }
        await requestDB.create({
          id: requestid,
          sender: value.userInfo.userName,
          receiver: query.userName,
          type: "friendRequest",
          query: "",
        })
        return ok("ok");
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
