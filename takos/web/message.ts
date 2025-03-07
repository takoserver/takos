import { zValidator } from "@hono/zod-validator";
import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Hono } from "hono";
const app = new Hono<MyEnv>();
app.use("*", authorizationMiddleware);
import { z } from "zod";
import friends from "../models/friends.ts";
import { load } from "@std/dotenv";
import { isValidMessage } from "@takos/takos-encrypt-ink";
import Message from "../models/message.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
import publish from "../utils/redisClient.ts";
import { Channels, Member } from "../models/groups.ts";
import { getUserPermission } from "../foundation/server.ts";
import { uploadFile } from "../utils/S3Client.ts";
const env = await load();

app.post(
  "send",
  zValidator(
    "json",
    z.object({
      roomId: z.string(),
      message: z.string(),
      sign: z.string(),
      type: z.string(),
      channelId: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { roomId, message, sign, type, channelId } = c.req.valid("json");
    const presedMessage = JSON.parse(message);
    const isLarge = presedMessage.isLarge;
    if (type === "friend") {
      if (
        !friends.findOne({
          userName: user.userName + "@" + env["domain"],
          friendId: roomId,
        })
      ) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      if (!isValidMessage(message)) {
        return c.json({ message: "Invalid message" }, 400);
      }
      const messageid = uuidv7() + "@" + env["domain"];
      const timestamp = new Date();
      if (isLarge) {
        await Message.create({
          userName: user.userName + "@" + env["domain"],
          timestamp,
          roomId,
          messageid,
          isEncrypted: true,
          isSigned: true,
          sign,
          isLarge: true,
        });
        await uploadFile(messageid, message);
      } else {
        await Message.create({
          userName: user.userName + "@" + env["domain"],
          timestamp,
          roomId,
          messageid,
          isEncrypted: true,
          isSigned: true,
          message,
          sign,
          isLarge: false,
        });
      }
      if (!isLarge) {
        publish({
          type: "message",
          users: [user.userName + "@" + env["domain"], roomId],
          data: JSON.stringify({
            messageid,
            timestamp,
            userName: user.userName + "@" + env["domain"],
            roomid: roomId,
          }),
        });
        if (roomId.split("@")[1] !== env["domain"]) {
          const res = await fff(
            JSON.stringify({
              event: "t.message.send",
              eventId: uuidv7(),
              payload: {
                userId: user.userName + "@" + env["domain"],
                messageId: messageid,
                roomId: roomId,
                roomType: "friend",
              },
            }),
            [roomId.split("@")[1]],
          ) as [Response] | { error: string };
          if ("error" in res) {
            return c.json({ message: res.error }, 500);
          }
          if (res[0].status !== 200) {
            return c.json({ message: "Failed to send message" }, 500);
          }
        }
      }
      return c.json({ messageId: messageid }, 200);
    }
    if (type === "group") {
      const match = roomId.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const friendUserName = match[1];
      const domainFromRoom = match[2];
      if (!channelId) return;
      console.log(channelId);
      if (
        !await Member.findOne({
          groupId: friendUserName + "@" + domainFromRoom,
          userId: user.userName + "@" + env["domain"],
        })
      ) {
        return c.json({ message: "Unauthorized2" }, 401);
      }
      if (!isValidMessage(message)) {
        return c.json({ message: "Invalid message" }, 400);
      }
      if (!isValidMessage(message)) {
        return c.json({ message: "Invalid message" }, 400);
      }

      if (!await Channels.findOne({ id: channelId })) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const permission = await getUserPermission(
        user.userName + "@" + env["domain"],
        friendUserName + "@" + domainFromRoom,
        channelId,
      );
      if (
        !permission.includes("SEND_MESSAGE") && !permission.includes("ADMIN")
      ) {
        return c.json({ message: "Unauthorized" }, 401);
      }
      const messageid = uuidv7() + "@" + env["domain"];
      const timestamp = new Date();
      if (isLarge) {
        await Message.create({
          userName: user.userName + "@" + env["domain"],
          timestamp,
          roomId,
          messageid,
          isEncrypted: true,
          isSigned: true,
          sign,
          channelId: channelId,
          isLarge: true,
        });
        await uploadFile(messageid, message);
      } else {
        await Message.create({
          userName: user.userName + "@" + env["domain"],
          timestamp,
          roomId,
          messageid,
          isEncrypted: true,
          isSigned: true,
          message,
          sign,
          channelId: channelId,
          isLarge: false,
        });
      }
      const Members =
        (await Member.find({ groupId: friendUserName + "@" + domainFromRoom }))
          .map((member) => member.userId);
      const MembersDomain = Members.map((member) => member.split("@")[1]);
      const MembersSet = new Set(MembersDomain);
      const MembersArray = Array.from(MembersSet);
      const findMember = MembersArray.findIndex((member) =>
        member === env["domain"]
      );
      if (findMember !== -1) {
        MembersArray.splice(findMember, 1);
      }
      const members = Members.filter((member) =>
        member.split("@")[1] == env["domain"]
      );
      console.log(members);
      publish({
        type: "message",
        users: members,
        data: JSON.stringify({
          messageid,
          timestamp,
          userName: user.userName + "@" + env["domain"],
          roomid: roomId,
          channelId: channelId,
        }),
      });
      if (!isLarge) {
        await fff(
          JSON.stringify({
            event: "t.message.send",
            eventId: uuidv7(),
            payload: {
              userId: user.userName + "@" + env["domain"],
              messageId: messageid,
              roomId: roomId,
              roomType: "group",
              channelId: channelId,
            },
          }),
          MembersArray,
        );
      }
      return c.json({ messageId: messageid }, 200);
    }
  },
);

app.post(
  "delete",
  zValidator(
    "json",
    z.object({
      messageId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { messageId } = c.req.valid("json");
    const message = await Message.findOne({ messageid: messageId });
    if (!message) {
      return c.json({ message: "Message not found" }, 404);
    }
    if (message.userName !== user.userName + "@" + env["domain"]) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    await Message.deleteOne({ messageid: messageId });
    return c.json({ message: "Deleted" }, 200);
  },
);

app.get("friend/:roomId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const roomId = c.req.param("roomId");
  const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
  if (!match) {
    return c.json({ error: "Invalid roomId format" }, 400);
  }

  const friendUserName = match[1];
  const domainFromRoom = match[2];
  const limit = Number(c.req.query("limit")) || 50;
  const before = c.req.query("before");

  // フレンド関係の確認
  const friendExists = await friends.findOne({
    userName: `${user.userName}@${env["domain"]}`,
    friendId: `${friendUserName}@${domainFromRoom}`,
  });

  if (!friendExists) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    let messages;

    if (!before) {
      // before未指定時は最新メッセージを取得
      messages = await getFriendMessages(
        user.userName,
        env["domain"],
        friendUserName,
        domainFromRoom,
        roomId,
        limit,
      );
    } else {
      // 特定の時間より前のメッセージを取得
      const beforeMessageId = await Message.findOne({
        roomId,
        timestamp: { $lt: new Date(before) },
        isLarge: { $in: [false, undefined] }, // isLargeがfalseまたは未設定
      }).sort({ timestamp: -1 });

      if (!beforeMessageId) {
        return c.json({ error: "Invalid before parameter" }, 400);
      }

      messages = await getFriendMessages(
        user.userName,
        env["domain"],
        friendUserName,
        domainFromRoom,
        roomId,
        limit,
        beforeMessageId.timestamp,
      );
    }

    return c.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to retrieve messages" }, 500);
  }
});

/**
 * フレンド間のメッセージを取得する共通関数
 */
async function getFriendMessages(
  userName: string,
  domain: string,
  friendUserName: string,
  friendDomain: string,
  roomId: string,
  limit: number,
  beforeTime?: Date,
) {
  const projection = { messageid: 1, timestamp: 1, userName: 1, _id: 0 };
  const myRoomCondition = {
    roomId,
    userName: `${userName}@${domain}`,
    isLarge: false,
    ...(beforeTime ? { timestamp: { $lt: beforeTime } } : {}),
  };

  const friendRoomCondition = {
    roomId: `m{${userName}}@${domain}`,
    userName: `${friendUserName}@${friendDomain}`,
    isLarge: false,
    ...(beforeTime ? { timestamp: { $lt: beforeTime } } : {}),
  };

  // 自分と相手のメッセージを並行して取得
  const [myMessages, friendMessages] = await Promise.all([
    Message.find(myRoomCondition, projection).limit(limit).sort({
      timestamp: -1,
    }),
    Message.find(friendRoomCondition, projection).limit(limit).sort({
      timestamp: -1,
    }),
  ]);

  // メッセージを結合、ソート、制限
  return myMessages.concat(friendMessages)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
    .reverse(); // クライアント側の表示用に古い順に戻す
}

app.get("group/:roomId/:channelId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  const roomId = c.req.param("roomId");
  const channelId = c.req.param("channelId");
  const limit = Number(c.req.query("limit")) || 50;
  const bfore = c.req.query("before");
  if (
    !Member.findOne({
      groupId: roomId,
      userId: user.userName + "@" + env["domain"],
    })
  ) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (!bfore) {
    const messages = await Message.find({
      roomId,
      channelId,
      isLarge: false,
    }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
      timestamp: -1,
    });
    return c.json({ messages });
  }
  const beforeMessageId = await Message.findOne({
    roomId,
    channelId,
    timestamp: { $lt: new Date(bfore) },
    isLarge: false,
  }).sort({ timestamp: -1 });
  if (!beforeMessageId) {
    return c.json({ error: "Invalid before" }, 400);
  }
  const beforemessageTime = beforeMessageId.timestamp;
  const messages = await Message.find({
    roomId,
    channelId,
    isLarge: false,
    timestamp: { $lt: beforemessageTime },
  }, { messageid: 1, timestamp: 1, userName: 1, _id: 0 }).limit(limit).sort({
    timestamp: -1,
  });

  return c.json({ messages });
});

export default app;
