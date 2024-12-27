import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import pubClient from "../../utils/pubClient.ts";
import { uuidv7 } from "uuidv7";
import {
  isValidAccountKeyPublic,
  isValidEncryptedAccountKey,
  isValidIdentityKeyPublic,
  isValidMasterKeyPublic,
  isValidMessage,
  isValidMigrateKeyPublic,
  isValidMigrateSignKeyPublic,
  isValidShareKeyPublic,
  isValidSignMasterkey,
  keyHash,
  verifyDataMigrateSignKey,
  verifyIdentityKey,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import { decode, Image } from "imagescript";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../../utils/buffers.ts";
import { checkNickName } from "../../utils/checks.ts";
import MigrateData from "../../models/migrateData.ts";
import { splitUserName } from "../../utils/utils.ts";
import env from "../../utils/env.ts";
import { requesterServer } from "../../utils/requesterServer.ts";
import requestDB from "../../models/request.ts";
import Friend from "../../models/Friend.ts";
import Group from "../../models/group.ts";
import Message from "../../models/message.ts";
import message from "../../models/message.ts";
import RoomKey from "../../models/roomKey.ts";
import KeyShareKey from "../../models/ShareKey.ts";
import IdentityKey from "../../models/Identitykeys.ts";
import AccountKey from "../../models/accountKey.ts";
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
        const sbareAccountKey = await AccountKey.find({
          userName: value.userInfo.userName,
          encryptedAccountKey: {
            $elemMatch: {
              0: value.sessionInfo.sessionUUID,
            },
          },
          deriveredSession: {
            $ne: value.sessionInfo.sessionid,
          },
        });
        return ok({
          setuped: value.userInfo.setup,
          sessionEncrypted: value.sessionInfo.encrypted,
          deviceKey: value.sessionInfo.deviceKey,
          share: sbareAccountKey.map((data) => {
            return data.hash;
          }),
        });
      },
    );
    singlend.on(
      "getShareData",
      z.object({
        hash: z.string(),
      }),
      async (query, value, ok, error) => {
        console.log("getAccountKey");
        const sbareAccountKey = await AccountKey.findOne({
          hash: query.hash,
        });
        if (!sbareAccountKey) return error("error", 400);
        return ok({
          accountKeyPrivate: (sbareAccountKey.encryptedAccountKey.find(
            (data) => data[0] === value.sessionInfo.sessionUUID,
          ))[1],
          sign: sbareAccountKey.sign,
          accountKeyPublic: sbareAccountKey.accoutKey,
        });
      },
    );
    singlend.on(
      "setUp",
      z.object({
        masterKey: z.string(),
        identityKey: z.string(),
        accountKey: z.string(),
        identityKeySign: z.string(),
        accountKeySign: z.string(),
        nickName: z.string(),
        icon: z.string(),
        birthday: z.string(),
        sessionUUID: z.string(),
        shareKey: z.string(),
        shareKeySign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.userInfo.setup) return error("error setup", 400);
        if (
          !isValidIdentityKeyPublic(query.identityKey) ||
          !isValidAccountKeyPublic(query.accountKey) ||
          !isValidShareKeyPublic(query.shareKey) ||
          !checkNickName(query.nickName) ||
          !isValidMasterKeyPublic(query.masterKey)
        ) return error("error", 400);
        if (
          !verifyMasterKey(
            query.masterKey,
            query.identityKeySign,
            query.identityKey,
          ) ||
          !verifyMasterKey(
            query.masterKey,
            query.accountKeySign,
            query.accountKey,
          ) ||
          !verifyMasterKey(query.masterKey, query.shareKeySign, query.shareKey)
        ) {
          return error("error", 400);
        }
        const { sessionUuid: idenSessionUuid } = JSON.parse(query.identityKey);
        const { sessionUuid: shareSessionUuid } = JSON.parse(query.shareKey);
        if (
          idenSessionUuid !== query.sessionUUID ||
          shareSessionUuid !== query.sessionUUID
        ) return error("error", 400);
        const iconBinary = base64ToArrayBuffer(query.icon);
        const icon = await decode(new Uint8Array(iconBinary));
        if (!icon) return error("error", 400);
        icon.resize(256, 256);
        const iconData = await icon.encode();
        await KeyShareKey.create({
          userName: value.userInfo.userName,
          shareKey: query.shareKey,
          sign: query.shareKeySign,
          sessionid: value.sessionInfo.sessionid,
        });
        await IdentityKey.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKey,
          sign: query.identityKeySign,
          hash: await keyHash(query.identityKey),
          sessionid: value.sessionInfo.sessionid,
          encryptedAccountKey: [],
        });
        await AccountKey.create({
          userName: value.userInfo.userName,
          accoutKey: query.accountKey,
          sign: query.accountKeySign,
          hash: await keyHash(query.accountKey),
          encryptedAccountKey: [],
        });
        await User.updateOne(
          { userName: value.userInfo.userName },
          {
            masterKey: query.masterKey,
            setup: true,
            nickName: query.nickName,
            icon: arrayBufferToBase64(iconData),
            birthday: query.birthday,
          },
        );
        await Session.updateOne(
          { sessionid: value.sessionInfo.sessionid },
          { encrypted: true, sessionUUID: query.sessionUUID },
        );
        return ok("ok");
      },
    );
    singlend.on(
      "noticeShareData",
      z.object({
        hash: z.string(),
      }),
      async (query, value, ok, error) => {
        const accountKey = await AccountKey.findOne({ hash: query.hash });
        if (!accountKey) return error("error", 400);
        const encryptedAccountKey = accountKey.encryptedAccountKey.find(
          (data) => data[0] === value.sessionInfo.sessionUUID,
        );
        if (!encryptedAccountKey) return error("error", 400);
        await AccountKey.updateOne(
          { hash: query.hash },
          {
            $push: {
              deriveredSession: value.sessionInfo.sessionid,
            },
          },
        );
        return ok("ok");
      },
    );
    singlend.on(
      "resetMasterKey",
      z.object({
        masterKey: z.string(),
        identityKey: z.string(),
        accountKey: z.string(),
        identityKeySign: z.string(),
        accountKeySign: z.string(),
        sessionUUID: z.string(),
        shareKey: z.string(),
        shareKeySign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.sessionInfo.encrypted) return error("error", 400);
        if (
          !isValidIdentityKeyPublic(query.identityKey) ||
          !isValidAccountKeyPublic(query.accountKey) ||
          !isValidShareKeyPublic(query.shareKey) ||
          !isValidMasterKeyPublic(query.masterKey)
        ) return error("error1", 400);
        if (
          !verifyMasterKey(
            query.masterKey,
            query.identityKeySign,
            query.identityKey,
          ) ||
          !verifyMasterKey(
            query.masterKey,
            query.accountKeySign,
            query.accountKey,
          ) ||
          !verifyMasterKey(query.masterKey, query.shareKeySign, query.shareKey)
        ) {
          return error("error2", 400);
        }
        const { sessionUuid: idenSessionUuid } = JSON.parse(query.identityKey);
        const { sessionUuid: shareSessionUuid } = JSON.parse(query.shareKey);
        if (
          idenSessionUuid !== query.sessionUUID ||
          shareSessionUuid !== query.sessionUUID
        ) return error("error3", 400);
        await User.updateOne(
          { userName: value.userInfo.userName },
          {
            masterKey: query.masterKey,
          },
        );
        await Session.deleteMany({
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        await KeyShareKey.deleteMany({
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        await IdentityKey.deleteMany({
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        await AccountKey.deleteMany({
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        await KeyShareKey.create({
          userName: value.userInfo.userName,
          shareKey: query.shareKey,
          sign: query.shareKeySign,
          sessionid: value.sessionInfo.sessionid,
        });
        await IdentityKey.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKey,
          sign: query.identityKeySign,
          hash: await keyHash(query.identityKey),
          sessionid: value.sessionInfo.sessionid,
        });
        await AccountKey.create({
          userName: value.userInfo.userName,
          accoutKey: query.accountKey,
          sign: query.accountKeySign,
          hash: await keyHash(query.accountKey),
          encryptedAccountKey: [],
          privateSign: "",
        });
        await Session.updateOne(
          { sessionid: value.sessionInfo.sessionid },
          { encrypted: true, sessionUUID: query.sessionUUID },
        );
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
        if (!isValidMigrateKeyPublic(query.migrateKey)) {
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
        if (!isValidMigrateSignKeyPublic(query.migrateSignKey)) {
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
        shareKey: z.string(),
        shareKeySign: z.string(),
        sessionUUID: z.string(),
        identityKey: z.string(),
        identityKeySign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (value.sessionInfo.encrypted) return error("error", 400);
        if (!value.userInfo.masterKey) return error("error", 400);
        if (!value.userInfo.setup) return error("error", 400);
        if (
          !isValidShareKeyPublic(query.shareKey) ||
          !isValidIdentityKeyPublic(query.identityKey) ||
          !isValidSignMasterkey(query.shareKeySign) ||
          !isValidSignMasterkey(query.identityKeySign)
        ) return error("error", 400);
        if (
          !verifyMasterKey(
            value.userInfo.masterKey,
            query.shareKeySign,
            query.shareKey,
          ) ||
          !verifyMasterKey(
            value.userInfo.masterKey,
            query.identityKeySign,
            query.identityKey,
          )
        ) {
          return error("error", 400);
        }
        const { sessionUuid: idenSessionUuid } = JSON.parse(query.identityKey);
        const { sessionUuid: shareSessionUuid } = JSON.parse(query.shareKey);
        if (
          idenSessionUuid !== query.sessionUUID ||
          shareSessionUuid !== query.sessionUUID
        ) return error("error", 400);
        await Session.updateOne({ sessionid: value.sessionInfo.sessionid }, {
          encrypted: true,
          sessionUUID: query.sessionUUID,
        });
        await KeyShareKey.create({
          userName: value.userInfo.userName,
          shareKey: query.shareKey,
          sign: query.shareKeySign,
          sessionid: value.sessionInfo.sessionid,
        });
        await IdentityKey.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKey,
          sign: query.identityKeySign,
          hash: await keyHash(query.identityKey),
          sessionid: value.sessionInfo.sessionid,
        });
        return ok("ok");
      },
    );
    singlend.on(
      "getShareKeys",
      z.object({}),
      async (_query, value, ok) => {
        const sessionDatas = await Session.find({
          encrypted: true,
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        const result = [];
        for (const sessionData of sessionDatas) {
          const keyShareKey = await KeyShareKey.findOne({
            sessionid: sessionData.sessionid,
            userName: value.userInfo.userName,
          }).sort({ timestamp: -1 });
          if (!keyShareKey) continue;
          result.push({
            session: sessionData.sessionUUID,
            shareKey: keyShareKey.shareKey,
            sign: keyShareKey.sign,
          });
        }
        return ok({ keyShareKeys: result });
      },
    );
    singlend.on(
      "updateIdentityKey",
      z.object({
        identityKeyPublic: z.string(),
        idenSign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (!value.userInfo.masterKey) return error("error", 400);
        if (!isValidIdentityKeyPublic(query.identityKeyPublic)) {
          return error("error", 400);
        }
        if (
          verifyDataMigrateSignKey(
            value.userInfo.masterKey,
            query.idenSign,
            query.identityKeyPublic,
          )
        ) {
          return error("error", 400);
        }
        const { sessionUuid: idenSessionUuid } = JSON.parse(
          query.identityKeyPublic,
        );
        if (idenSessionUuid !== value.sessionInfo.sessionUUID) {
          return error("error", 400);
        }
        await IdentityKey.create({
          userName: value.userInfo.userName,
          identityKey: query.identityKeyPublic,
          sign: query.idenSign,
          hash: await keyHash(query.identityKeyPublic),
          sessionid: value.sessionInfo.sessionid,
        });
        return ok("ok");
      },
    );
    singlend.on(
      "updateAccountKey",
      z.object({
        accountKeyPublic: z.string(),
        accSign: z.string(),
        sharedData: z.array(z.any()),
      }),
      async (query, value, ok, error) => {
        if (!value.userInfo.masterKey) return error("error", 400);
        if (!isValidAccountKeyPublic(query.accountKeyPublic)) {
          return error("error", 400);
        }
        if (
          !verifyMasterKey(
            value.userInfo.masterKey,
            query.accSign,
            query.accountKeyPublic,
          )
        ) {
          return error("error", 400);
        }
        const encryptedAccountKey: [string, string][] = [];
        for (const data of query.sharedData) {
          const sessionUUID = data[0];
          const encryptedAccountKeyValue = data[1];
          if (!isValidEncryptedAccountKey(encryptedAccountKeyValue)) {
            return error("error1", 400);
          }
          if (!await Session.findOne({ sessionUUID })) {
            return error("error2", 400);
          }
          if (!isValidEncryptedAccountKey(encryptedAccountKeyValue)) {
            return error("error3", 400);
          }
          encryptedAccountKey.push([sessionUUID, encryptedAccountKeyValue]);
        }
        await AccountKey.create({
          userName: value.userInfo.userName,
          accoutKey: query.accountKeyPublic,
          sign: query.accSign,
          hash: await keyHash(query.accountKeyPublic),
          encryptedAccountKey: encryptedAccountKey,
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
        if (
          await requestDB.findOne({
            sender: query.userName,
            receiver: value.userInfo.userName + "@" + env["DOMAIN"],
            type: "friendRequest",
          }) ||
          await requestDB.findOne({
            sender: value.userInfo.userName + "@" + env["DOMAIN"],
            receiver: query.userName,
            type: "friendRequest",
          })
        ) {
          return error("error1", 400);
        }
        const requestid = uuidv7() + "@" + env["DOMAIN"];
        if (domain !== env["DOMAIN"]) {
          console.log("requestRemoteServer");
          const requestRemoteServer = await requesterServer(
            domain,
            "requestFriend",
            JSON.stringify({
              sender: value.userInfo.userName + "@" + env["DOMAIN"],
              receiver: query.userName,
              id: requestid,
            }),
          );
          console.log(requestRemoteServer);
          if (requestRemoteServer.status) {
            await requestDB.create({
              id: requestid,
              sender: value.userInfo.userName + "@" + env["DOMAIN"],
              receiver: query.userName,
              type: "friendRequest",
              query: "",
            });
            return ok("ok");
          }
          return error("error2", 400);
        }
        await requestDB.create({
          id: requestid,
          sender: value.userInfo.userName + "@" + env["DOMAIN"],
          receiver: query.userName,
          type: "friendRequest",
          query: "",
        });
        return ok("ok");
      },
    );
    singlend.on(
      "acceptFriend",
      z.object({
        id: z.string(),
      }),
      async (query, value, ok, error) => {
        const requestDatas = await requestDB.findOne({
          id: query.id,
          receiver: value.userInfo.userName + "@" + env["DOMAIN"],
          type: "friendRequest",
        });
        if (!requestDatas) return error("error1", 400);
        const { domain } = splitUserName(requestDatas.sender);
        if (domain !== env["DOMAIN"]) {
          const requestRemoteServer = await requesterServer(
            domain,
            "acceptFriend",
            JSON.stringify({
              id: query.id,
            }),
          );
          if (requestRemoteServer.status) {
            await Friend.create({
              userName: value.userInfo.userName + "@" + env["DOMAIN"],
              friendId: requestDatas.sender,
            });
            await requestDB.deleteOne({ id: query.id });
            return ok("ok");
          }
          console.log(requestRemoteServer);
          return error("error2", 400);
        }
        await Friend.create({
          userName: value.userInfo.userName + "@" + env["DOMAIN"],
          friendId: requestDatas.sender,
        });
        await Friend.create({
          userName: requestDatas.sender,
          friendId: value.userInfo.userName + "@" + env["DOMAIN"],
        });
        await requestDB.deleteOne({ id: query.id });
        return ok("ok");
      },
    );
    singlend.on(
      "getNotification",
      z.object({}),
      async (_query, value, ok, error) => {
        const requestDatas = await requestDB.find({
          receiver: value.userInfo.userName + "@" + env["DOMAIN"],
          type: "friendRequest",
        });
        const result = requestDatas.map((data) => {
          return {
            id: data.id,
            sender: data.sender,
            type: data.type,
          };
        });
        return ok({
          request: result,
        });
      },
    );
    singlend.on(
      "getTalkList",
      z.object({}),
      async (_query, value, ok, error) => {
        const friends = await Friend.find({
          userName: value.userInfo.userName + "@" + env["DOMAIN"],
        });
        const groups = await Group.find({ members: value.userInfo.userName });
        const friendResult = await Promise.all(friends.map(async (data) => {
          const messageLatest = await Message.findOne({
            type: "friend",
            $or: [
              {
                roomid: data.userName + "-" + data.friendId,
              },
              {
                roomid: data.friendId + "-" + data.userName,
              },
            ],
          }).sort({ timestamp: -1 });
          if (!messageLatest) {
            return {
              roomName: data.friendId,
              type: "friend",
              timestamp: data.timestamp,
              roomid: data.userName + "-" + data.friendId,
            };
          }
          return {
            roomName: data.friendId,
            type: "friend",
            timestamp: messageLatest.timestamp,
            roomid: data.userName + "-" + data.friendId,
          };
        }));
        const groupResult = await Promise.all(groups.map(async (data) => {
          const messageLatest = await Message.findOne({
            type: "group",
            roomid: data.uuid,
          }).sort({ timestamp: -1 });
          if (!messageLatest) {
            return {
              roomName: data.uuid,
              type: "group",
              timestamp: data.timestamp,
              roomid: data.uuid,
            };
          }
          return {
            roomName: data.uuid,
            type: "group",
            timestamp: messageLatest.timestamp,
            roomid: data.uuid,
          };
        }));
        return ok({
          talkList: (friendResult.concat(groupResult)).sort((a, b) => {
            return a.timestamp > b.timestamp ? -1 : 1;
          }),
        });
      },
    );
    singlend.on(
      "getFriendIcon",
      z.object({
        userName: z.string(),
      }),
      async (query, value, ok, error) => {
        const { domain, userName } = splitUserName(query.userName);
        if (
          !Friend.findOne({
            userName: value.userInfo.userName + "@" + env["DOMAIN"],
            friendId: query.userName,
          })
        ) {
          return error("error", 400);
        }
        if (domain !== env["DOMAIN"]) {
          const requestRemoteServer = await requesterServer(
            domain,
            "getFriendIcon",
            JSON.stringify({
              userName: query.userName,
              requester: value.userInfo.userName + "@" + env["DOMAIN"],
            }),
          );
          if (requestRemoteServer.status) {
            return ok({
              icon: requestRemoteServer.icon,
            });
          }
          return error("error", 400);
        }
        const friend = await User.findOne({ userName });
        if (!friend) return error("error", 400);
        if (!friend.icon) return error("error", 400);
        return ok({
          icon: friend.icon,
        });
      },
    );
    singlend.on(
      "getFriendNickName",
      z.object({
        userName: z.string(),
      }),
      async (query, value, ok, error) => {
        const { domain, userName } = splitUserName(query.userName);
        if (
          !Friend.findOne({
            userName: value.userInfo.userName + "@" + env["DOMAIN"],
            friendId: query.userName,
          })
        ) {
          return error("error1", 400);
        }
        if (domain !== env["DOMAIN"]) {
          const requestRemoteServer = await requesterServer(
            domain,
            "getFriendNickName",
            JSON.stringify({
              userName: query.userName,
              requester: value.userInfo.userName + "@" + env["DOMAIN"],
            }),
          );
          if (requestRemoteServer.status) {
            return ok({
              nickName: requestRemoteServer.nickName,
            });
          }
          return error("error2", 400);
        }
        const friend = await User.findOne({ userName });
        if (!friend) return error("error3", 400);
        if (!friend.nickName) return error("error4", 400);
        return ok({
          nickName: friend.nickName,
        });
      },
    );
    singlend.on(
      "updateRoomKey",
      z.object({
        roomid: z.string(),
        metaData: z.string(),
        metaDataSign: z.string(),
        sign: z.string(),
        roomType: z.string(),
        encryptedKey: z.array(z.any()),
      }),
      async (query, value, ok, error) => {
        if (!value.userInfo.masterKey) return error("error1", 400);
        if (query.roomType !== "group" && query.roomType !== "friend") {
          return error("error2", 400);
        }
        console.log(JSON.parse(query.sign).keyHash);
        const idenKey = await IdentityKey.findOne({
          userName: value.userInfo.userName,
          sessionid: value.sessionInfo.sessionid,
          hash: JSON.parse(query.sign).keyHash,
        });
        if (!idenKey) {
          return error("error3", 400);
        }
        if (
          !verifyIdentityKey(
            idenKey.identityKey,
            query.metaDataSign,
            query.metaData,
          )
        ) {
          return error("error4", 400);
        }
        if (query.roomType === "friend") {
          const nameInfo = query.roomid.split("-");
          if (nameInfo.length !== 2) {
            return error("error6", 400);
          }
          if (nameInfo[0] !== value.userInfo.userName + "@" + env["DOMAIN"]) {
            return error("erro7", 400);
          }
          if (
            !await Friend.findOne({
              userName: value.userInfo.userName + "@" + env["DOMAIN"],
              friendId: nameInfo[1],
            })
          ) {
            return error("error8", 400);
          }
          const id = uuidv7();
          const latestRoomKey = await RoomKey.findOne({
            roomid: query.roomid,
            sessionid: value.sessionInfo.sessionid,
          }).sort({ timestamp: -1 });
          if (!latestRoomKey) {
            const userIds = [
              value.userInfo.userName + "@" + env["DOMAIN"],
              nameInfo[1],
            ];
            await RoomKey.create({
              userName: value.userInfo.userName,
              roomid: query.roomid,
              roomType: query.roomType,
              sessionid: value.sessionInfo.sessionid,
              id,
              encryptedRoomKey: query.encryptedKey.map((data: {
                encryptedData: string;
                userId: string;
              }) => {
                if (!userIds.includes(data.userId)) {
                  throw new Error("error9");
                }
                userIds.splice(userIds.indexOf(data.userId), 1);
                return [data.userId, data.encryptedData];
              }),
              roomKeySign: query.sign,
              metaData: query.metaData,
              metaDataSign: query.metaDataSign,
            });
            return ok({ id });
          } else if (
            new Date(latestRoomKey.timestamp).getTime() <
              new Date().getTime() - 1000 * 60 * 10
          ) {
            console.log("updateRoomKey");
            const userIds = [
              value.userInfo.userName + "@" + env["DOMAIN"],
              nameInfo[1],
            ];
            const id = uuidv7();
            await RoomKey.create({
              userName: value.userInfo.userName,
              roomid: query.roomid,
              roomType: query.roomType,
              sessionid: value.sessionInfo.sessionid,
              id,
              encryptedRoomKey: query.encryptedKey.map((data: {
                encryptedData: string;
                userId: string;
              }) => {
                if (!userIds.includes(data.userId)) {
                  throw new Error("error10");
                }
                userIds.splice(userIds.indexOf(data.userId), 1);
                return [data.userId, data.encryptedData];
              }),
              roomKeySign: query.sign,
              metaData: query.metaData,
              metaDataSign: query.metaDataSign,
            });
            return ok({ id });
          } else {
            return error("error11", 400);
          }
        }
        return ok("ok");
      },
    );
    singlend.on(
      "getRoomKey",
      z.object({
        roomid: z.string(),
        id: z.string(),
      }),
      async (query, value, ok, error) => {
        const roomKey = await RoomKey.findOne({
          roomid: query.roomid,
          userName: value.userInfo.userName,
          sessionid: value.sessionInfo.sessionid,
          id: query.id,
        });
        if (!roomKey) return error("error", 400);
        return ok({
          encryptedKey: roomKey.encryptedRoomKey.find((data) =>
            data[0] === value.userInfo.userName + "@" + env["DOMAIN"]
          )[1],
          sign: roomKey.roomKeySign,
          metaData: roomKey.metaData,
          metaDataSign: roomKey.metaDataSign,
        });
      },
    );
    singlend.on(
      "sendMessage",
      z.object({
        roomid: z.string(),
        roomType: z.string(),
        message: z.string(),
        sign: z.string(),
      }),
      async (query, value, ok, error) => {
        if (query.roomType !== "group" && query.roomType !== "friend") {
          return error("error1", 400);
        }
        if (query.roomType === "friend") {
          const nameInfo = query.roomid.split("-");
          if (nameInfo.length !== 2) {
            return error("error2", 400);
          }
          if (nameInfo[0] !== value.userInfo.userName + "@" + env["DOMAIN"]) {
            return error("error3", 400);
          }
          if (
            !await Friend.findOne({
              userName: value.userInfo.userName + "@" + env["DOMAIN"],
              friendId: nameInfo[1],
            })
          ) {
            return error("error4", 400);
          }
          const presedMessage = JSON.parse(query.message);
          if (
            new Date(presedMessage.timestamp).getTime() >
              new Date().getTime() + 1000 * 60 * 1
          ) {
            return error("error5", 400);
          }
          const presedSign = JSON.parse(query.sign);
          const idenKey = await IdentityKey.findOne({
            userName: value.userInfo.userName,
            sessionid: value.sessionInfo.sessionid,
            hash: presedSign.keyHash,
          });
          if (!idenKey) {
            return error("error6", 400);
          }
          if (
            !verifyIdentityKey(idenKey.identityKey, query.sign, query.message)
          ) {
            return error("error7", 400);
          }
          if (!isValidMessage(query.message)) {
            return error("error8", 400);
          }
          const messageid = uuidv7() + "@" + env["DOMAIN"];
          if (splitUserName(nameInfo[1]).domain !== env["DOMAIN"]) {
            const requestRemoteServer = await requesterServer(
              splitUserName(nameInfo[1]).domain,
              "sendMessage",
              JSON.stringify({
                roomid: query.roomid,
                roomType: "friend",
                messageid: messageid,
                sender: value.userInfo.userName + "@" + env["DOMAIN"],
              }),
            );
            console.log(requestRemoteServer);
            if (!requestRemoteServer.status) {
              return error("error9", 400);
            }
          }
          await Message.create({
            messageid: messageid,
            isLocal: true,
            type: "friend",
            roomid: query.roomid,
            message: query.message,
            sign: query.sign,
            timestamp: presedMessage.timestamp,
            roomKeyHash: (JSON.parse(presedMessage.value)).keyHash,
            read: [],
          });
          return ok("ok");
        }
        return error("error9", 400);
      },
    );
    singlend.on(
      "getMessages",
      z.object({
        roomid: z.string(),
        roomType: z.string(),
        limit: z.number(),
        since: z.string().optional(),
      }),
      async (query, value, ok, error) => {
        if (query.roomType !== "group" && query.roomType !== "friend") {
          return error("error1", 400);
        }
        if (query.roomType === "friend") {
          const nameInfo = query.roomid.split("-");
          if (nameInfo.length !== 2) {
            return error("error2", 400);
          }
          if (nameInfo[0] !== value.userInfo.userName + "@" + env["DOMAIN"]) {
            return error("error3", 400);
          }
          if (
            !await Friend.findOne({
              userName: value.userInfo.userName + "@" + env["DOMAIN"],
              friendId: nameInfo[1],
            })
          ) {
            return error("error4", 400);
          }
          let messages;
          if (query.since) {
            messages = await Message.find({
              type: "friend",
              roomid: query.roomid,
              timestamp: { $gt: query.since },
            }).sort({ timestamp: 1 }).limit(query.limit);
          } else {
            messages = await Message.find({
              type: "friend",
              roomid: query.roomid,
            }).sort({ timestamp: 1 }).limit(query.limit);
          }
          const remoteMessages = messages.filter((data) => !data.isLocal);
          const localMessagesResult = messages.filter((data) => data.isLocal)
            .map((data) => {
              return {
                message: data.message,
                sign: data.sign,
                timestamp: data.timestamp,
                read: data.read,
                roomKeyHash: data.roomKeyHash,
              };
            });
          if (remoteMessages.length === 0) {
            return ok({
              messages: localMessagesResult,
            });
          }
          const remoteMessagesResponse = await multiFetchClient(
            remoteMessages.map((data) => {
              return [
                splitUserName(data.roomid!.split("-")[1]).domain,
                "getMessage",
                JSON.stringify({
                  messageid: data.messageid,
                }),
              ];
            }),
          );
          const remoteMessagesResult = remoteMessagesResponse.map((data) => {
            return {
              message: data.message,
              sign: data.sign,
              timestamp: data.timestamp, // ここを追加
              read: data.read,
              roomKeyHash: data.roomKeyHash,
            };
          });
          return ok({
            messages: localMessagesResult.concat(remoteMessagesResult).sort(
              (a, b) => {
                return a.timestamp > b.timestamp ? 1 : -1;
              },
            ),
          });
        }
        return error("error5", 400);
      },
    );
    return singlend;
  },
);

export async function multiFetchClient(
  data: [string, string, string][],
): Promise<any[]> {
  const promises = data.map(([param1, param2, param3]) =>
    requesterServer(param1, param2, param3)
  );
  const results = await Promise.all(promises);
  return results;
}

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
function isValidMetaData(data: string, shareUser: number) {
  // y = 119x+73
  const keyLength = 119 * shareUser + 73;
  if (data.length !== keyLength) {
    console.log(data.length, keyLength);
    return false;
  }
  return true;
}
