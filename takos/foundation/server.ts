import app from "../foundation.ts";
import { zValidator } from "@hono/zod-validator";
import { any, z } from "zod";
import Message from "../models/message.ts";
import friends from "../models/friends.ts";
import request from "../models/request.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
import {
  Category,
  ChannelPermissions,
  Channels,
  Group,
  Member,
  Roles,
} from "../models/groups.ts";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "https://jsr.io/@takos/takos-encrypt-ink/5.3.2/utils/buffers.ts";
import { resizeImageTo256x256 } from "../web/sessions.ts";
import { load } from "@std/dotenv";
import User from "../models/users.ts";
import { channel } from "node:diagnostics_channel";
import publish from "../utils/redisClient.ts";
const env = await load();

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      event: z.string(),
      eventId: z.string(),
      payload: z.object({}).passthrough(),
    }),
  ),
  async (c) => {
    const { event, payload } = c.req.valid("json");
    const domain = c.get("domain");
    switch (event) {
      case "t.friend.request": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          friendId: z.string().email(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, friendId } = parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (!await User.findOne({ userName: friendId.split("@")[0] })) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        if (friendId.split("@")[1] !== env["domain"]) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        const friend = await friends.findOne({
          userId: friendId,
          friendId: userId,
        });
        if (friend) {
          return c.json({ error: "Already friends" }, 400);
        }
        const isAlredyRequested = await request.findOne({
          sender: userId,
          receiver: friendId,
          type: "friend",
        });
        if (isAlredyRequested) {
          return c.json({ message: "Already requested" }, 400);
        }
        await request.create({
          sender: userId,
          receiver: friendId,
          type: "friend",
          local: false,
        });
        return c.json(200);
      }
      case "t.friend.cancel": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          friendId: z.string().email(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, friendId } = parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (!await User.findOne({ userName: friendId.split("@")[0] })) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        if (friendId.split("@")[1] !== env["domain"]) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        const friend = await friends.findOne({
          userId: friendId,
          friendId: userId,
        });
        if (friend) {
          return c.json({ error: "Already friends" }, 400);
        }
        const request2 = await request.findOne({
          sender: userId,
          receiver: friendId,
          type: "friend",
        });
        if (!request2) {
          return c.json({ error: "Request not found" }, 400);
        }
        await request.deleteOne({
          sender: userId,
          receiver: friendId,
        });
        return c.json(200);
      }
      case "t.friend.accept": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          friendId: z.string().email(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, friendId } = parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (!await User.findOne({ userName: friendId.split("@")[0] })) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        if (friendId.split("@")[1] !== env["domain"]) {
          return c.json({ error: "Invalid friendId" }, 400);
        }
        const friend = await friends.findOne({
          userName: friendId,
          friendId: userId,
        });
        if (friend) {
          return c.json({ error: "Already friends" }, 400);
        }
        const request2 = await request.findOne({
          sender: friendId,
          receiver: userId,
          type: "friend",
        });
        if (!request2) {
          return c.json({ error: "Request not found" }, 400);
        }
        await friends.create({
          userName: friendId,
          friendId: userId,
        });
        await request.deleteOne({
          sender: friendId,
          receiver: userId,
        });
        return c.json(200);
      }
      case "t.message.send": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          messageId: z.string(),
          roomId: z.string(),
          roomType: z.string(),
          channelId: z.string().optional(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, messageId, roomId, roomType, channelId } =
          parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (roomId.split("@")[1] !== env["domain"]) {
          return c.json({ error: "Invalid roomId" }, 400);
        }
        if (roomType !== "friend" && roomType !== "group") {
          return c.json({ error: "Invalid roomType" }, 400);
        }
        if (roomType === "friend") {
          const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
          if (!match) {
            return c.json({ error: "Invalid roomId format" }, 400);
          }
          const roomIdUserName = match[1];
          const roomIdDomain = match[2];
          const friend = await friends.findOne({
            userName: roomIdUserName + "@" + roomIdDomain,
            friendId: userId,
          });
          if (!friend) {
            return c.json({ message: "Unauthorized" }, 401);
          }
          if (messageId.split("@")[1] !== domain) {
            return c.json({ message: "Unauthorized" }, 401);
          }
          const timestamp = new Date();
          await Message.create({
            roomId: roomId,
            messageid: messageId,
            userName: userId,
            timestamp: timestamp,
          });
          publish({
            type: "message",
            users: [roomIdUserName + "@" + roomIdDomain],
            data: JSON.stringify({
              messageid: messageId,
              timestamp,
              userName: userId,
              roomid: `m{${userId.split("@")[0]}}@${userId.split("@")[1]}`,
            }),
          });
          return c.json({ message: "success" });
        }
        if (!channelId) {
          return c.json({ error: "Invalid channelId" }, 400);
        }
        break;
      }
      case "t.friend.group.invite": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          groupId: z.string(),
          inviteUserId: z.string().email(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          console.log(parsedPayload.error);
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, groupId, inviteUserId } = parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (groupId.split("@")[1] == env["domain"]) {
          return c.json({ error: "Invalid groupId" }, 400);
        }
        if (
          !await friends.findOne({ userName: inviteUserId, friendId: userId })
        ) {
          return c.json({ error: "Unauthorized" }, 401);
        }
        if (await Member.findOne({ groupId: groupId, userId: inviteUserId })) {
          return c.json({ error: "Unauthorized" }, 401);
        }
        await request.create({
          sender: userId,
          receiver: inviteUserId,
          type: "groupInvite",
          query: groupId,
          local: false,
        });
        return c.json(200);
      }
      case "t.group.invite.accept": {
        const payloadSchema = z.object({
          userId: z.string().email(),
          groupId: z.string(),
        });
        const parsedPayload = payloadSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return c.json({ error: "Invalid payload" }, 400);
        }
        const { userId, groupId } = parsedPayload.data;
        if (userId.split("@")[1] !== domain) {
          return c.json({ error: "Invalid userId" }, 400);
        }
        if (groupId.split("@")[1] !== env["domain"]) {
          return c.json({ error: "Invalid groupId" }, 400);
        }
        const group = await Group.findOne({ groupId: groupId });
        if (!group || !group.invites.includes(userId)) {
          return c.json({ error: "Invalid groupId" }, 400);
        }
        await Member.create({
          groupId: groupId,
          userId: userId,
        });
        await Group.updateOne({ groupId }, {
          $pull: { invites: userId },
        });
        return c.json(200);
      }
    }
    return c.json({ error: "Invalid event" }, 400);
  },
);

async function getUserPermission(
  userId: string,
  groupId: string,
  channelId?: string,
) {
  const user = await Member.findOne({
    groupId: groupId,
    userId: userId,
  });
  if (!user) {
    throw new Error("User not found");
  }
  const roles = await Roles.find({
    groupId: groupId,
    id: { $in: user.role },
  });
  if (!roles) {
    throw new Error("Roles not found");
  }
  const response = [];
  for (const role of roles) {
    const permissions = role.permissions;
    response.push(...permissions);
  }
  //responseの重複を削除
  if (!channelId) {
    return [...new Set(response)];
  }
  const channelPermission = await ChannelPermissions.findOne({
    groupId: groupId,
    channelId: channelId,
    roleId: { $in: user.role },
  });
  if (!channelPermission) {
    return [...new Set(response)];
  }
  response.push(...channelPermission.permissions);
  return [...new Set(response)];
}

async function getGroupMemberServers(groupId: string) {
  const members = await Member.find({
    groupId: groupId,
  });
  const response = [];
  for (const member of members) {
    response.push(member.userId.split("@")[1]);
  }
  //responseの重複を削除
  return [...new Set(response)];
}

export default app;
