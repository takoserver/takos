import { Hono } from "hono";
import { array, z } from "zod";
import { Singlend } from "@evex/singlend";
import { cors } from "hono/cors";
import serverKey from "../../models/serverKey.ts";
import { verifyData } from "@takos/takos-encrypt-ink";
import { verifyDataServer } from "../../utils/requesterServer.ts";
import requestDB from "../../models/request.ts";
import { splitUserName } from "../../utils/utils.ts";
import { getTimestampFromUUIDv7 } from "../../utils/uuidToTimeStamp.ts";
import env from "../../utils/env.ts";
import Friend from "../../models/Friend.ts";
import User from "../../models/users.ts";
import RoomKey from "../../models/roomKey.ts";
import Group from "../../models/group.ts";
import Message from "../../models/message.ts";
const app = new Hono();
const singlend = new Singlend();

singlend.on(
  "getServerKey",
  z.object({}),
  async (_query, ok, error) => {
    const key = await serverKey.findOne({}).sort({ timestamp: -1 });
    if (!key) {
      return error("aaa", 500);
    }
    return ok({
      pubKey: key.public,
      expire: key.expire,
      timestamp: key.timestamp,
    });
  },
);

singlend.group(
  z.object({
    signature: z.string(),
    request: z.string(),
    keyTimestamp: z.string(),
    keyExpire: z.string(),
    serverDomain: z.string(),
  }),
  async (query, next, error) => {
    const verify = await verifyDataServer(query);
    if (verify[0]) {
      return next({
        request: verify[1],
        serverDomain: query.serverDomain,
      });
    }
    return error({
      error: "invalid signature",
    }, 500);
  },
  (singlend) => {
    singlend.on(
      "requestFriend",
      z.object({}),
      async (query, value, ok) => {
        const request: {
          id: string;
          sender: string;
          receiver: string;
        } = value.request;
        if (
          await requestDB.findOne({
            sender: request.sender,
            receiver: request.receiver,
            type: "friendRequest",
          })
        ) {
          return ok({
            error: "already requested",
            status: false,
          });
        }
        const { domain: userDoamin } = splitUserName(request.sender);
        const { domain: idDomain, userName: uuidv7 } = splitUserName(
          request.id,
        );
        const serverDomain = query.serverDomain;
        console.log(request);
        if (userDoamin !== serverDomain || idDomain !== serverDomain) {
          console.log(
            "userDomain" + userDoamin,
            "serverDoamin" + serverDomain,
            "idDomain" + idDomain,
          );
          return ok({
            error: "invalid domain",
            status: false,
          });
        }
        if (env["DOMAIN"] !== (splitUserName(request.receiver)).domain) {
          return ok({
            error: "invalid domain2",
            status: false,
          });
        }
        const timestamp = new Date(getTimestampFromUUIDv7(uuidv7)).getTime();
        if (timestamp < new Date().getTime() - 5 * 60 * 1000) {
          return ok({
            error: "invalid timestamp",
            status: false,
          });
        }
        await requestDB.create({
          id: request.id,
          sender: request.sender,
          receiver: request.receiver,
          type: "friendRequest",
          query: "",
        });
        return ok({
          status: true,
        });
      },
    );
    singlend.on(
      "acceptFriend",
      z.object({}),
      async (_query, value, ok) => {
        const request: {
          id: string;
        } = value.request;
        const { domain: userDoamin } = splitUserName(request.id);
        if (userDoamin !== env["DOMAIN"]) {
          return ok({
            error: "invalid domain",
            status: false,
          });
        }
        const requestDBData = await requestDB.findOne({
          id: request.id,
          type: "friendRequest",
        });
        if (!requestDBData) {
          return ok({
            error: "request not found",
            status: false,
          });
        }
        if (
          value.serverDomain !== splitUserName(requestDBData.receiver).domain
        ) {
          return ok({
            error: "invalid domain2",
            status: false,
          });
        }
        await Friend.create({
          userName: requestDBData.sender,
          friendId: requestDBData.receiver,
        });
        await requestDB.deleteOne({
          id: request.id,
        });
        return ok({
          status: true,
        });
      },
    );
    /*
    singlend.on(
      "rejectFriend",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );
    singlend.on(
      "inviteGroup",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );
    singlend.on(
      "acceptInviteGroup",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );
    singlend.on(
      "rejectInviteGroup",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );
    singlend.on(
      "leaveGroup",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );
    singlend.on(
      "kickGroup",
      z.object({}),
      async (_query, value, ok, error) => {
      },
    );*/
    singlend.on(
      "getFriendIcon",
      z.object({}),
      async (_query, value, ok, error) => {
        const { domain: userDoamin } = splitUserName(value.request.requester);
        if (userDoamin !== value.serverDomain) {
          return error("error", 400);
        }
        if (
          !Friend.findOne({
            userName: value.request.userName,
            friendId: value.request.requester,
          })
        ) {
          return error("error", 400);
        }
        const { userName } = splitUserName(value.request.userName);
        const userInfo = await User.findOne({ userName: userName });
        if (!userInfo) {
          return error("error", 400);
        }
        return ok({
          icon: userInfo.icon,
          status: true,
        });
      },
    );
    singlend.on(
      "getFriendNickName",
      z.object({}),
      async (_query, value, ok, error) => {
        const { domain: userDoamin } = splitUserName(value.request.requester);
        if (userDoamin !== value.serverDomain) {
          return error("error1", 400);
        }
        if (
          !Friend.findOne({
            userName: value.request.userName,
            friendId: value.request.requester,
          })
        ) {
          return error("error1", 400);
        }
        const { userName } = splitUserName(value.request.userName);
        const userInfo = await User.findOne({ userName: userName });
        if (!userInfo) {
          return error("error", 400);
        }
        return ok({
          nickName: userInfo.nickName,
          status: true,
        });
      },
    );
    singlend.on(
      "getRoomKey",
      z.object({}),
      async (_query, value, ok, error) => {
        const request: {
          roomid: string;
          keyHash: string;
          userId: string;
          type: "friend" | "group";
          requester: string;
        } = value.request;
        const { domain: userDoamin } = splitUserName(request.requester);
        if (userDoamin !== value.serverDomain) {
          return error("error", 400);
        }
        const { domain: friendDomain } = splitUserName(request.userId);
        if (friendDomain !== env["DOMAIN"]) {
          return error("error", 400);
        }
        if (request.type === "friend") {
          if (
            !Friend.findOne({
              userName: request.userId,
              friendId: request.requester,
            })
          ) {
            return error("error", 400);
          }
          const roomKey = await RoomKey.findOne({
            roomid: request.roomid,
            keyHash: request.keyHash,
          });
          if (!roomKey) {
            return error("error", 400);
          }
          const encryptedkey = roomKey.encryptedRoomKey.find((key) => {
            return key[0] === request.userId;
          });
          if (!encryptedkey) {
            return error("error", 400);
          }
          return ok({
            key: encryptedkey[1] as string,
            status: true,
          });
        } else if (request.type === "group") {
          if (
            !Group.findOne({
              uuid: request.roomid,
              members: {
                $in: [request.userId, request.requester],
              },
            })
          ) {
            return error("error", 400);
          }
          const roomKey = await RoomKey.findOne({
            roomid: request.roomid,
            keyHash: request.keyHash,
          });
          if (!roomKey) {
            return error("error", 400);
          }
          const encryptedkey = roomKey.encryptedRoomKey.find((key) => {
            return key[0] === request.userId;
          });
          if (!encryptedkey) {
            return error("error", 400);
          }
          return ok({
            key: encryptedkey[1] as string,
            status: true,
          });
        } else {
          return error("error", 400);
        }
      },
    );
    singlend.on(
      "sendMessage",
      z.object({}),
      async (_query, value, ok, error) => {
        const request: {
          roomid: string;
          sender: string;
          roomType: "friend" | "group";
          timestamp: string;
          messageid: string;
        } = value.request;
        console.log("messageid", request.sender);
        const { domain: userDoamin } = splitUserName(request.sender);
        if (userDoamin !== value.serverDomain) {
          return error("error", 400);
        }
        if (request.roomType === "friend") {
          const roomidRequster = splitUserName(request.roomid).userName;
          const roomidFriend = splitUserName(request.roomid).domain;
          if (
            !Friend.findOne({
              userName: roomidRequster,
              friendId: roomidFriend,
            })
          ) {
            return error("error", 400);
          }
          const messageuuidDomain = splitUserName(request.messageid).domain;
          if (value.serverDomain !== messageuuidDomain) {
            return error("error", 400);
          }
          await Message.findOne({
            roomid: roomidFriend + "-" + roomidFriend,
            isLocal: false,
            timestamp: request.timestamp,
            messageid: request.messageid,
          });
          return ok({
            status: true,
          });
        } else if (request.roomType === "group") {
          return error("error", 400);
        } else {
          return error("error", 400);
        }
      },
    );
    singlend.on(
      "getMessage",
      z.object({}),
      async (_query, value, ok, error) => {
        const { domain: userDoamin } = splitUserName(value.request.requester);
        if (userDoamin !== value.serverDomain) {
          return error("error", 400);
        }
        const request: {
          roomid: string;
          messageid: string;
          requester: string;
          roomType: "friend" | "group";
        } = value.request;
        console.log("messageid", request.messageid);
        if (value.serverDomain !== splitUserName(request.requester).domain) {
          return error("error", 400);
        }
        if (request.roomType === "friend") {
          const roomidRequster = splitUserName(request.roomid).userName;
          const roomidFriend = splitUserName(request.roomid).domain;
          if (
            !Friend.findOne({
              userName: roomidRequster,
              friendId: roomidFriend,
            })
          ) {
            return error("error", 400);
          }
          const messageuuidDomain = splitUserName(request.messageid).domain;
          if (env["DOMAIN"] !== messageuuidDomain) {
            return error("error", 400);
          }
          const message = await Message.findOne({
            roomid: roomidFriend + "-" + roomidRequster,
            messageid: request.messageid,
          });
          if (!message) {
            return error("error", 400);
          }
          return ok({
            message: message.message,
            sign: message.sign,
            read: message.read,
            roomKeyHash: message.roomKeyHash,
            status: true,
          });
        } else if (request.roomType === "group") {
          return error("error", 400);
        } else {
          return error("error", 400);
        }
      },
    );
    return singlend;
  },
);

app.post("/", singlend.handler());
export default app;
