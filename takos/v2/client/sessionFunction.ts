import { Singlend } from "@evex/singlend";
import z from "zod";
import User from "../../models/users.ts";
import Session from "../../models/sessions.ts";
import pubClient from "../../utils/pubClient.ts";
import { uuidv7 } from "uuidv7";
import {
  isValidAccountKeyPrivate,
  isValidAccountKeyPublic,
  isValidEncryptedAccountKey,
  isValidEncryptedRoomKey,
  isValidIdentityKeyPrivate,
  isValidIdentityKeyPublic,
  isValidMasterKeyPublic,
  isValidMigrateKeyPublic,
  isValidMigrateSignKeyPublic,
  isValidShareKeyPublic,
  isValidSignMasterkey,
  keyHash,
  verifyDataMigrateSignKey,
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
        return ok({
          setuped: value.userInfo.setup,
          sessionEncrypted: value.sessionInfo.encrypted,
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
        if(idenSessionUuid !== query.sessionUUID || shareSessionUuid !== query.sessionUUID) return error("error", 400);
        const iconBinary = base64ToArrayBuffer(query.icon);
        const icon = await decode(new Uint8Array(iconBinary));
        if (!icon) return error("error", 400);
        icon.resize(256, 256);
        const iconData = await icon.encode();
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
          { encrypted: true,
            sessionUUID: query.sessionUUID,
           },
        );
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
          accountKey: query.accountKey,
          sign: query.accountKeySign,
          hash: await keyHash(query.accountKey),
          encryptedAccountKey: [],
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
        if(!value.userInfo.masterKey) return error("error", 400);
        if(!value.userInfo.setup) return error("error", 400);
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
        if(idenSessionUuid !== query.sessionUUID || shareSessionUuid !== query.sessionUUID) return error("error", 400);
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
      "getKeyShareKeys",
      z.object({}),
      async (_query, value, ok) => {
        const sessionDatas = await Session.find({
          encrypted: true,
          userName: value.userInfo.userName,
          sessionid: { $ne: value.sessionInfo.sessionid },
        });
        const result = []
        for (const sessionData of sessionDatas) {
          const keyShareKey = await KeyShareKey.findOne({
            sessionid: sessionData.sessionid,
            userName: value.userInfo.userName,
          }).sort({ timestamp: -1 });
          if (!keyShareKey) continue;
          result.push({
            session: sessionData.sessionUUID,
            shareKey: keyShareKey.ShareKey,
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
        if(!value.userInfo.masterKey) return error("error", 400);
        if (!isValidIdentityKeyPublic(query.identityKeyPublic)) {
          return error("error", 400);
        }
        if (verifyDataMigrateSignKey(value.userInfo.masterKey, query.idenSign,query.identityKeyPublic)) {
          return error("error", 400);
        }
        const { sessionUuid: idenSessionUuid } = JSON.parse(query.identityKeyPublic);
        if(idenSessionUuid !== value.sessionInfo.sessionUUID) return error("error", 400);
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
        sharedData: z.array(z.array(z.string(), z.string())),
      }),
      async (query, value, ok, error) => {
        if(!value.userInfo.masterKey) return error("error", 400);
        if (!isValidAccountKeyPublic(query.accountKeyPublic)) {
          return error("error", 400);
        }
        if (verifyDataMigrateSignKey(value.userInfo.masterKey, query.accSign,query.accountKeyPublic)) {
          return error("error", 400);
        }
        await AccountKey.create({
          userName: value.userInfo.userName,
          accountKey: query.accountKeyPublic,
          sign: query.accSign,
          hash: await keyHash(query.accountKeyPublic),
          encryptedAccountKey: query.sharedData.map((data) => {
            const sessionUUID = data[0];
            const encryptedAccountKey = data[1];
            if(!isValidEncryptedAccountKey(encryptedAccountKey)) return null;
            if(!Session.findOne({ sessionUUID })) return null;
            return [sessionUUID, encryptedAccountKey];
          })
        });
        return ok("ok");
      },
    );
    singlend.on(
      "getAccountKeyPrivate",
      z.object({
        hash: z.string(),
      }),
      async (query, value, ok, error) => {
        const accountKey = await AccountKey.findOne({
          userName: value.userInfo.userName,
          hash: query.hash,
        });
        if (!accountKey) return error("error", 400);
        const accountKeyPrivate = accountKey.encryptedAccountKey.find((data) => {
          return data[0] === value.sessionInfo.sessionUUID;
        });
        if (!accountKeyPrivate) return error("error", 400);
        return ok({
          accountKeyPrivate: accountKeyPrivate[1],
        });
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
          return error("error", 400);
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
          return error("error", 400);
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
            friend: {
              $all: [data.userName, data.friendId],
            },
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
        type: z.string(),
        roomid: z.string(),
        sign: z.string(),
        encryptedKey: z.array(z.any()),
      }),
      async (query, value, ok, error) => {
        const validateFriendRoom = async () => {
          const [user, friend] = query.roomid.split("-");
          if (user !== value.userInfo.userName + "@" + env["DOMAIN"]) {
            return error("error1", 400);
          }
          if (!await Friend.findOne({ userName: user, friendId: friend })) {
            return error("error2", 400);
          }
          const users = [user, friend];
          for (const encryptedKey of query.encryptedKey) {
            const userId = encryptedKey[0];
            if (!users.includes(userId)) return error("error3", 400);
            users.splice(users.indexOf(userId), 1);
          }
          return users.length === 0;
        };

        const validateGroupRoom = async () => {
          const group = await Group.findOne({ uuid: query.roomid });
          if (!group) return error("error4", 400);
          if (!group.members.includes(value.userInfo.userName)) {
            return error("error5", 400);
          }
          const users = group.members;
          for (const encryptedKey of query.encryptedKey) {
            if (!users.includes(encryptedKey[0])) return error("error6", 400);
            users.splice(users.indexOf(encryptedKey[0]), 1);
          }
          return users.length === 0;
        };

        const isValid = query.type === "friend"
          ? await validateFriendRoom()
          : query.type === "group"
          ? await validateGroupRoom()
          : false;
        if (!isValid) return error("error7", 400);
        await RoomKey.create({
          roomid: query.roomid,
          type: query.type,
          roomKey: query.encryptedKey,
          sign: query.sign,
        });
        return ok("ok");
      },
    );
    singlend.on(
      "getLatestMyRoomKey",
      z.object({
        roomid: z.string(),
      }),
      async (query, value, ok, error) => {
        const roomKey = await RoomKey.findOne({
          roomid: query.roomid,
          type: "friend",
        }).sort({ timestamp: -1 });
        if (!roomKey) {
          return ok({
            encryptedKey: null,
            status: false,
          });
        }
        const encryptedkey = roomKey.roomKey.find((data) => {
          return data[0] === value.userInfo.userName + "@" + env["DOMAIN"];
        });
        if (!encryptedkey) return error("error", 400);
        return ok({
          encryptedKey: encryptedkey[1] as string,
          status: true,
        });
      },
    );
    singlend.on(
      "getRoomKey",
      z.object({
        roomid: z.string(),
        keyHash: z.string(),
        userId: z.string(),
        type: z.string(),
      }),
      async (query, value, ok, error) => {
        if (query.type === "friend") {
          const [user, friend] = query.roomid.split("-");
          if (user !== value.userInfo.userName + "@" + env["DOMAIN"]) {
            return error("error1", 400);
          }
          if (!await Friend.findOne({ userName: user, friendId: friend })) {
            return error("error2", 400);
          }
          if (query.userId == friend) {
            const { userName: _, domain } = splitUserName(friend);
            if (domain !== env["DOMAIN"]) {
              const requestRemoteServer = await requesterServer(
                domain,
                "getRoomKey",
                JSON.stringify({
                  roomid: friend + "-" + user,
                  keyHash: query.keyHash,
                  userId: query.userId,
                  type: "friend",
                  requester: value.userInfo.userName + "@" + env["DOMAIN"],
                }),
              );
              if (requestRemoteServer.status) {
                return ok({
                  encryptedKey: requestRemoteServer.encryptedKey,
                });
              }
              return error("error3", 400);
            }
            const roomKey = await RoomKey.findOne({
              roomid: friend + "-" + user,
              type: "friend",
            }).sort({ timestamp: -1 });
            if (!roomKey) return error("error3", 400);
            const encryptedkey = roomKey.roomKey.find((data) => {
              return data[0] === query.userId;
            });
            if (!encryptedkey) return error("error4", 400);
            return ok({
              encryptedKey: encryptedkey[1] as string,
            });
          } else if (query.userId == user) {
            const roomKey = await RoomKey.findOne({
              roomid: user + "-" + friend,
              type: "friend",
            }).sort({ timestamp: -1 });
            if (!roomKey) return error("error5", 400);
            const encryptedkey = roomKey.roomKey.find((data) => {
              return data[0] === query.userId;
            });
            if (!encryptedkey) return error("error6", 400);
            return ok({
              encryptedKey: encryptedkey[1] as string,
            });
          } else {
            return error("error3", 400);
          }
        } else if (query.type === "group") {
          const group = await Group.findOne({ uuid: query.roomid });
          if (!group) return error("error7", 400);
          if (!group.members.includes(value.userInfo.userName)) {
            return error("error8", 400);
          }
          if (!group.members.includes(query.userId)) {
            return error("error9", 400);
          }
          const { userName: _, domain } = splitUserName(query.userId);
          if (domain == env["DOMAIN"]) {
            const roomKey = await RoomKey.findOne({
              roomid: query.roomid,
              type: "group",
            }).sort({ timestamp: -1 });
            if (!roomKey) return error("error10", 400);
            const encryptedkey = roomKey.roomKey.find((data) => {
              return data[0] === query.userId;
            });
            if (!encryptedkey) return error("error11", 400);
            return ok({
              encryptedKey: encryptedkey[1] as string,
            });
          } else {
            const requestRemoteServer = await requesterServer(
              domain,
              "getRoomKey",
              JSON.stringify({
                roomid: query.roomid,
                keyHash: query.keyHash,
                userId: query.userId,
                type: "group",
              }),
            );
            if (requestRemoteServer.status) {
              return ok({
                encryptedKey: requestRemoteServer.encryptedKey,
              });
            }
            return error("error12", 400);
          }
        } else {
          return error("error4", 400);
        }
      },
    );
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
