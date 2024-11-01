import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import KeyShareData from "../../models/keyShareData.ts";
import {
  isValidMasterKeyPub,
  isValidIdentityPublicKey,
  isValidAccountPublicKey,
  isValidKeyShareKeyPublic,
  isValidkeyShareSignKeyPublic,
  verifyDataIdentityKey,
  verifyDataMasterKey,
} from "@takos/takos-encrypt-ink"

import { decode, Image } from "imagescript"
import { arrayBufferToBase64, base64ToArrayBuffer } from "../../utils/buffers.ts";
import { checkNickName } from "../../utils/checks.ts";

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
      z.object({
      }),
      async (query, value, ok) => {
        const SharedData = await KeyShareData.find({
          sessionid: value.sessionInfo.sessionid,
        })
        return ok({
          setuped: value.userInfo.setup,
          sessionEncrypted: value.sessionInfo.encrypted,
          sharedDataIds: SharedData.map((data) => data.id),
          deviceKey : value.sessionInfo.deviceKey,
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
      async (query, value, ok,error) => {
        if(value.userInfo.setup) return error("error setup", 400);
        console.log(isValidMasterKeyPub(query.masterKey),
        isValidIdentityPublicKey(query.identityKey),
        isValidAccountPublicKey(query.accountKey),
        isValidKeyShareKeyPublic(query.keyShareKey),
        isValidkeyShareSignKeyPublic(query.keyShareSignKey));
        if (
          !isValidMasterKeyPub(query.masterKey) ||
          !isValidIdentityPublicKey(query.identityKey) ||
          !isValidAccountPublicKey(query.accountKey) ||
          !isValidKeyShareKeyPublic(query.keyShareKey) ||
          !isValidkeyShareSignKeyPublic(query.keyShareSignKey)
        ) return error("error Valid", 400);
        if (
          !verifyDataMasterKey(query.identityKey ,query.masterKey, query.identityKeySign) ||
          !verifyDataIdentityKey(query.accountKey,query.identityKey,  query.accountKeySign) ||
          !verifyDataMasterKey(query.keyShareKey, query.masterKey, query.keyShareKeySign) ||
          !verifyDataMasterKey(query.keyShareSignKey, query.masterKey, query.keyShareSignKeySign)
        ) return error("error verify", 400);
        if (!isValidUUIDv7(query.sessionUUID)) return error("error UUID", 400);
        if(!checkNickName(query.nickName)) return error("error nickName", 400);
        if(new Date(query.birthday) > new Date()) return error("error birthday", 400); 
        await Session.updateOne({ sessionid: value.sessionInfo.sessionid }, {
          encrypted: true,
          sessionUUID: query.sessionUUID,
          keyShareKey: query.keyShareKey,
          keyShareSignKey: query.keyShareSignKey,
          keyShareSignSing: query.keyShareSignKeySign,
          keyShareSing: query.keyShareKeySign,
        })
        await User.updateOne({ userName: value.userInfo.userName }, {
          setup: true,
          masterKey: query.masterKey,
          icon: await resizeImage(query.icon),
          nickName: query.nickName,
          birthday: new Date(query.birthday),
        });
        return ok("ok");
      }
    );
    return singlend;
  }
)

export default singlend;

function isValidUUIDv7(uuid: string): boolean {
  const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV7Regex.test(uuid);
}

async function resizeImage(icon: string) {
  const imageArrayBuffer = base64ToArrayBuffer(icon);
  const image = await Image.decode(new Uint8Array(imageArrayBuffer));
  const resizedImage = image.resize(256, 256);
  const resizedImageArrayBuffer = await resizedImage.encodeJPEG();
  return arrayBufferToBase64(resizedImageArrayBuffer);
}