import app from "../foundation.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Message from "../models/message.ts";
import friends from "../models/users/friends.ts";
import request from "../models/request.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
import { type Context } from "hono";
import {
  Category,
  CategoryPermissions,
  ChannelPermissions,
  Channels,
  Group,
  JoinRequest,
  Member,
  Roles,
} from "../models/groups/groups.ts";
import { load } from "@std/dotenv";
import User from "../models/users/users.ts";
import publish from "../utils/redisClient.ts";
import { createRemoteGroup, handleReCreateGroup } from "../web/groups/utils.ts";
import { handleAddChannel } from "../web/groups/channel/add.ts";
import { handleRemoveChannel } from "../web/groups/channel/delete.ts";
import { handleAddCategory } from "../web/groups/category/add.ts";
import { handleRemoveCategory } from "../web/groups/category/delete.ts";
import { handleAddRole } from "../web/groups/role/add.ts";
import { handleRemoveRole } from "../web/groups/role/delete.ts";
import { handleAcceptJoinRequest } from "../web/groups/join/accept.ts";
import { handleKickUser } from "../web/groups/user/kick.ts";
import { handleBanUser } from "../web/groups/user/ban.ts";
import { handleUnbanUser } from "../web/groups/user/unban.ts";
import { handleSettings } from "../web/groups/settings.ts";
import { handleGiveRole } from "../web/groups/role/user.ts";


const env = await load();

class EventManager {
  private events = new Map<
    string,
    {
      schema: z.ZodSchema<any>;
      handler: (c: Context, payload: any) => Promise<any>;
    }
  >();

  add<T>(
    eventName: string,
    schema: z.ZodSchema<T>,
    handler: (c: Context, payload: T) => Promise<any>,
  ) {
    this.events.set(eventName, { schema, handler });
  }

  async dispatch(c: Context) {
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    const { event, payload } = c.req.valid("json");
    const eventDef = this.events.get(event);
    if (!eventDef) {
      return c.json({ error: "Invalid event" }, 400);
    }
    const parsed = eventDef.schema.safeParse(payload);
    if (!parsed.success) {
      console.log(payload);
      return c.json({ error: "Invalid payload" }, 400);
    }
    return eventDef.handler(c, parsed.data);
  }
}

const eventManager = new EventManager();

eventManager.add(
  "t.friend.request",
  z.object({
    userId: z.string().email(),
    friendId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, friendId } = payload;
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
    console.log(friend, userId, friendId);
    if (friend) {
      return c.json({ error: "Already friends" }, 400);
    }
    const alreadyRequested = await request.findOne({
      sender: userId,
      receiver: friendId,
      type: "friend",
    });
    if (alreadyRequested) {
      return c.json({ message: "Already requested" }, 400);
    }
    await request.create({
      sender: userId,
      receiver: friendId,
      type: "friend",
      local: false,
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.friend.cancel",
  z.object({
    userId: z.string().email(),
    friendId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, friendId } = payload;
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
    const reqItem = await request.findOne({
      sender: userId,
      receiver: friendId,
      type: "friend",
    });
    if (!reqItem) {
      return c.json({ error: "Request not found" }, 400);
    }
    await request.deleteOne({
      sender: userId,
      receiver: friendId,
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.friend.accept",
  z.object({
    userId: z.string().email(),
    friendId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, friendId } = payload;
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
    const reqItem = await request.findOne({
      sender: friendId,
      receiver: userId,
      type: "friend",
    });
    if (!reqItem) {
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
  },
);

eventManager.add(
  "t.message.send",
  z.object({
    userId: z.string().email(),
    messageId: z.string(),
    roomId: z.string(),
    roomType: z.string(),
    channelId: z.string().optional(),
  }),
  async (c, payload) => {
    console.log("t.message.send");
    const domain = c.get("domain");
    const { userId, messageId, roomId, roomType, channelId } = payload;
    if (userId.split("@")[1] !== domain) {
      console.log("error1");
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (roomType !== "friend" && roomType !== "group") {
      console.log("error3");
      return c.json({ error: "Invalid roomType" }, 400);
    }
    console.log(messageId);
    if (roomType === "friend") {
      if (roomId.split("@")[1] !== env["domain"]) {
        return c.json({ error: "Invalid roomId" }, 400);
      }
      const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const roomIdUserName = match[1];
      const roomIdDomain = match[2];
      const friendRecord = await friends.findOne({
        userName: roomIdUserName + "@" + roomIdDomain,
        friendId: userId,
      });
      if (!friendRecord) {
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
        isLarge: false,
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
    if (roomType === "group") {
      const match = roomId.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return c.json({ error: "Invalid roomId format" }, 400);
      }
      const roomIdUserName = match[1];
      const roomIdDomain = match[2];
      if (!channelId) {
        return c.json({ error: "Invalid channelId" }, 400);
      }
      const permission = await getUserPermission(
        userId,
        roomIdUserName + "@" + roomIdDomain,
        channelId,
      );
      if (
        !permission.includes("SEND_MESSAGE") && !permission.includes("ADMIN")
      ) {
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
        channelId: channelId,
        isLarge: false,
      });
      const members = (
        await Member.find({ groupId: roomIdUserName + "@" + roomIdDomain })
      )
        .map((member) => member.userId)
        .filter((member) => member.split("@")[1] == env["domain"]);
      publish({
        type: "message",
        users: members,
        data: JSON.stringify({
          messageid: messageId,
          timestamp,
          userName: userId,
          roomid: `g{${roomIdUserName}}@${roomIdDomain}`,
          channelId: channelId,
        }),
      });
      return c.json({ message: "success" });
    }
    console.log("error4");
    return c.json({ error: "Invalid roomType" }, 400);
  },
);

// t.friend.group.invite
eventManager.add(
  "t.friend.group.invite",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    inviteUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, inviteUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] == env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (!await friends.findOne({ userName: inviteUserId, friendId: userId })) {
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
  },
);

// t.group.invite.accept
eventManager.add(
  "t.group.invite.accept",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId } = payload;
    if (userId.split("@")[1] !== domain) {
      console.log("error1");
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      console.log("error2");
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
    const domains = (await Member.find({ groupId })).map((member) =>
      member.userId.split("@")[1]
    ).filter((domain) => domain !== env["domain"]);
    const uniqueDomains = Array.from(new Set(domains));
    const eventId = uuidv7();
    const res = await fff(
      JSON.stringify({
        event: "t.group.sync.user.add",
        eventId: eventId,
        payload: {
          groupId,
          userId: userId,
          beforeEventId: group.beforeEventId,
          role: [],
        },
      }),
      uniqueDomains,
    );
    await Group.updateOne({ groupId }, {
      $pull: { invites: userId },
      $set: { beforeEventId: eventId },
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.user.add",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { userId, groupId } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    if (userId.split("@")[1] == env["domain"]) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    if (member) {
      return c.json({ error: "Already member" }, 400);
    }
    await Member.create({
      groupId: groupId,
      userId: userId,
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.role.assign",
  z.object({
    groupId: z.string(),
    roleId: z.array(z.string()),
    userId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, roleId, userId } = payload;
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (!member) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    await Member.updateOne(
      { groupId: groupId, userId: userId },
      { role: roleId },
    );
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.invite.send",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    inviteUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, inviteUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (await Member.findOne({ groupId: groupId, userId: inviteUserId })) {
      return c.json({ error: "Already member" }, 400);
    }
    if (group.invites.includes(inviteUserId)) {
      return c.json({ error: "Already invited" }, 400);
    }
    const permissions = await getUserPermission(
      userId,
      groupId,
    );
    console.log(permissions);
    if (
      !permissions ||
      !permissions.includes("INVITE_USER") && !permissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    await Group.updateOne({ groupId }, { $push: { invites: inviteUserId } });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.user.remove",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { userId, groupId } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (!member) {
      return c.json({ error: "Not member" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    await Member.deleteOne({
      groupId: groupId,
      userId: userId,
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.channel.add",
  z.object({
    groupId: z.string(),
    channelId: z.string(),
    category: z.string().optional(),
    permissions: z.array(z.object({
      roleId: z.string(),
      permissions: z.array(z.string()),
    })).optional(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, channelId, category, permissions } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId2" }, 400);
    }
    const channel = await Channels.findOne({
      groupId: groupId,
      id: channelId,
    });
    if (group.beforeEventId !== payload.beforeEventId) {
      console.log("recreate");
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    if (channel) {
      // 既存のチャンネルの場合は上書き更新
      await Channels.updateOne(
        { groupId: groupId, id: channelId },
        { category: category },
      );
      // 既存の権限を削除し、新たに設定
      await ChannelPermissions.deleteMany({
        groupId: groupId,
        channelId: channelId,
      });
      for (const permission of permissions ?? []) {
        await ChannelPermissions.create({
          groupId: groupId,
          channelId: channelId,
          roleId: permission.roleId,
          permissions: permission.permissions,
        });
      }
    } else {
      // チャンネルが存在しない場合は新規作成
      await Channels.create({
        groupId: groupId,
        id: channelId,
        category: category,
      });
      for (const permission of permissions ?? []) {
        await ChannelPermissions.create({
          groupId: groupId,
          channelId: channelId,
          roleId: permission.roleId,
          permissions: permission.permissions,
        });
      }
    }
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.channel.remove",
  z.object({
    groupId: z.string(),
    channelId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, channelId } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId2" }, 400);
    }
    const channel = await Channels.findOne({
      groupId: groupId,
      id: channelId,
    });
    if (!channel) {
      return c.json({ error: "Not channel" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    await Channels.deleteOne({
      groupId: groupId,
      id: channelId,
    });
    await ChannelPermissions.deleteMany({
      groupId: groupId,
      channelId: channelId,
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.category.add",
  z.object({
    groupId: z.string(),
    categoryId: z.string(),
    permissions: z.array(
      z.object({
        roleId: z.string(),
        permissions: z.array(z.string()),
      }),
    ),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, categoryId, permissions } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId2" }, 400);
    }
    const channel = await Category.findOne({
      groupId: groupId,
      id: categoryId,
    });
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    console.log(-1);
    if (channel) {
      await CategoryPermissions.deleteMany({
        groupId: groupId,
        categoryId: categoryId,
      });
      for (const permission of permissions ?? []) {
        await CategoryPermissions.create({
          groupId: groupId,
          categoryId: categoryId,
          roleId: permission.roleId,
          permissions: permission.permissions,
        });
      }
    } else {
      // チャンネルが存在しない場合は新規作成
      console.log(1);
      await Category.create({
        groupId: groupId,
        id: categoryId,
      });
      console.log(2);
      for (const permission of permissions ?? []) {
        await CategoryPermissions.create({
          groupId: groupId,
          categoryId: categoryId,
          roleId: permission.roleId,
          permissions: permission.permissions,
        });
      }
      console.log(3);
    }
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.category.remove",
  z.object({
    groupId: z.string(),
    categoryId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, categoryId } = payload;
    if (groupId.split("@")[1] === env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain !== groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId2" }, 400);
    }
    const channel = await Category.findOne({
      groupId: groupId,
      id: categoryId,
    });
    if (!channel) {
      return c.json({ error: "Not channel" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    await Category.deleteOne({
      groupId: groupId,
      id: categoryId,
    });
    await CategoryPermissions.deleteMany({
      groupId: groupId,
      categoryId,
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.role.remove",
  z.object({
    groupId: z.string(),
    roleId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, roleId } = payload;
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (domain === groupId.split("@")[1]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId, eventId);
      return c.json(200);
    }
    await Member.updateMany({
      groupId: groupId,
    }, {
      $pull: { role: roleId },
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.leave",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId } = payload;
    if (userId.split("@")[1] !== domain) {
      console.log(userId.split("@")[1], domain);
      return c.json({ error: "Invalid userId1" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (group.isOwner) {
      const member = await Member.findOne({ groupId: groupId, userId: userId });
      if (!member) {
        return c.json({ error: "Invalid userId2" }, 400);
      }
      await Member.deleteOne({ groupId: groupId, userId: userId });
      await fff(
        JSON.stringify({
          event: "t.group.sync.user.remove",
          eventId: uuidv7(),
          payload: {
            userId: userId,
            groupId: groupId,
            beforeEventId: group.beforeEventId,
          },
        }),
        await getGroupMemberServers(groupId),
      );
      return c.json(200);
    } else {
      return c.json({ error: "Invalid groupId" }, 400);
    }
  },
);

eventManager.add(
  "t.group.invite.cancel",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    inviteUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, inviteUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || group.owner !== userId) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    if (await Member.findOne({ groupId: groupId, userId: inviteUserId })) {
      return c.json({ error: "Already member" }, 400);
    }
    if (!group.invites.includes(inviteUserId)) {
      return c.json({ error: "Not invited" }, 400);
    }
    await Group.updateOne({ groupId }, { $pull: { invites: inviteUserId } });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.channel.add",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    channelName: z.string(),
    channelId: z.string(),
    categoryId: z.string(),
    permissions: z.array(z.object({
      roleId: z.string(),
      permissions: z.array(z.string()),
    })),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, channelName, channelId, categoryId, permissions } =
      payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const permission = await getUserPermission(
      userId,
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    console.log(permission);
    if (
      !permission.includes(`MANAGE_CHANNEL`) && !permission.includes(`ADMIN`)
    ) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: userId,
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (categoryId) {
      if (!await Category.findOne({ id: categoryId, groupId })) {
        return c.json({ message: "Invalid categoryId" }, 400);
      }
    }
    await handleAddChannel(
      {
        groupId,
        name: channelName,
        id: channelId,
        categoryId,
        permissions,
        beforeEventId: group.beforeEventId!,
      },
    );
    return c.json(200);
  },
);

eventManager.add(
  "t.group.channel.remove",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    channelId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, channelId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const permission = await getUserPermission(
      userId,
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (
      !permission.includes(`MANAGE_CHANNEL`) && !permission.includes(`ADMIN`)
    ) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: userId,
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    await handleRemoveChannel({
      groupId,
      channelId,
      beforeEventId: group.beforeEventId!,
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.category.add",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    categoryId: z.string(),
    categoryName: z.string(),
    permissions: z.array(z.object({
      roleId: z.string(),
      permissions: z.array(z.string()),
    })),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, categoryId, categoryName, permissions } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const permission = await getUserPermission(
      userId,
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (
      !permission.includes(`MANAGE_CATEGORY`) && !permission.includes(`ADMIN`)
    ) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: userId,
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    await handleAddCategory(
      {
        groupId,
        id: categoryId,
        name: categoryName,
        permissions,
        beforeEventId: group.beforeEventId!,
      },
    );
    return c.json(200);
  },
);

eventManager.add(
  "t.group.category.remove",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    categoryId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, categoryId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const permission = await getUserPermission(
      userId,
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (
      !permission.includes(`MANAGE_CATEGORY`) && !permission.includes(`ADMIN`)
    ) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: userId,
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    await handleRemoveCategory({
      groupId,
      categoryId,
      beforeEventId: group.beforeEventId!,
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.role.add",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    roleName: z.string(),
    roleId: z.string(),
    color: z.string(),
    permissions: z.array(z.string()),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, roleName, roleId, color, permissions } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group
      .findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleAddRole({
      groupId,
      userId,
      name: roleName,
      id: roleId,
      color,
      permissions,
      context: c,
    });
  },
);

eventManager.add(
  "t.group.role.remove",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    roleId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, roleId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group
      .findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleRemoveRole({
      groupId,
      userId,
      roleId,
      c: c,
      beforeEventId: group.beforeEventId!,
    });
  },
);

eventManager.add(
  "t.friend.group.accept",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId } = payload;
    if (userId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const requests = await JoinRequest.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (!requests) {
      return c.json({ error: "Invalid request" }, 400);
    }
    if (!await Group.findOne({ groupId: groupId })) {
      const groupData = await fetch(
        `https://${domain}/_takos/v1/group/all/${groupId}`,
      );
      if (groupData.status !== 200) {
        return c.json({ message: "Error accepting group3" }, 500);
      }
      try {
        await createRemoteGroup(groupId, await groupData.json(), [userId]);
      } catch (err) {
        return c.json({ message: "Error accepting group4" }, 500);
      }
    }
    await Member.create({
      groupId: groupId,
      userId: userId,
    });
    await JoinRequest.deleteOne({
      groupId: groupId,
      userId: userId,
    });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.join.accept",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    targetUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, targetUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleAcceptJoinRequest({
      groupId,
      accepter: userId,
      userId: targetUserId,
      c: c,
    });
  },
);

eventManager.add(
  "t.group.kick",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    targetUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, targetUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleKickUser({
      groupId,
      kikker: userId,
      userId: targetUserId,
      c: c,
    });
  },
);

eventManager.add(
  "t.group.ban",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    targetUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, targetUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleBanUser({
      groupId,
      bannner: userId,
      userId: targetUserId,
      c: c,
    });
  },
);

eventManager.add(
  "t.group.unban",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    targetUserId: z.string().email(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, targetUserId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleUnbanUser({
      groupId,
      userId: targetUserId,
      c: c,
      unbanner: userId,
    });
  },
);

eventManager.add(
  "t.group.settings",
  z.object({
    userId: z.string().email(),
    groupId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    allowJoin: z.boolean().optional(),
    icon: z.string().optional(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId, name, description, allowJoin, icon } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleSettings({
      groupId,
      userId,
      c: c,
      name,
      description,
      allowJoin,
      icon,
    });
  },
);

eventManager.add(
  "t.group.user.role",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    assignUserId: z.string(),
    roleId: z.array(z.string()),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { groupId, userId, assignUserId, roleId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group || !group.isOwner) {
      return c.json({ error: "Invalid groupId" }, 400);
    }
    return await handleGiveRole({
      groupId,
      userId,
      targetUserId: assignUserId,
      roleId,
      c: c,
      beforeEventId: group.beforeEventId!,
    });
  },
);

eventManager.add(
  "t.group.join.request",
  z.object({
    userId: z.string(),
    groupId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const { userId, groupId } = payload;
    if (userId.split("@")[1] !== domain) {
      return c.json({ error: "Invalid userId" }, 400);
    }
    if (groupId.split("@")[1] !== env["domain"]) {
      return c.json({ error: "Invalid groupId1" }, 400);
    }
    if (await Member.findOne({ groupId: groupId, userId: userId })) {
      return c.json({ error: "Already member" }, 400);
    }
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ error: "Invalid groupId2" }, 400);
    }
    if (!group.isOwner) {
      return c.json({ error: "Invalid groupId3" }, 400);
    }
    if (group.requests.includes(userId)) {
      return c.json({ error: "Already requested" }, 400);
    }
    if (group.type === "public" && !group.allowJoin) {
      await Group.updateOne({ groupId }, { $push: { requests: userId } });
      return c.json(200);
    }
    return c.json({ error: "Invalid groupId4" }, 400);
  },
);

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
    try {
      return await eventManager.dispatch(c);
    } catch (err) {
      console.error(err);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

export async function getUserPermission(
  userId: string,
  groupId: string,
  channelId?: string,
) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    throw new Error("Group not found");
  }
  if (group.owner === userId) {
    return [`ADMIN`];
  }
  const user = await Member.findOne({
    groupId: groupId,
    userId: userId,
  });
  if (!user) {
    throw new Error("User not found");
  }
  const roles = await Roles.find({
    groupId: groupId,
    id: { $in: [...user.role, "everyone"] },
  });
  if (!roles) {
    throw new Error("Roles not found");
  }
  const response = [];
  for (const role of roles) {
    const permissions = role.permissions;
    response.push(...permissions);
  }
  if (!channelId) {
    return [...new Set(response)];
  }
  const channelPermissions = await ChannelPermissions.find({
    groupId: groupId,
    channelId: channelId,
    roleId: { $in: ["everyone", ...user.role] },
  });
  if (channelPermissions && channelPermissions.length > 0) {
    for (const cp of channelPermissions) {
      response.push(...cp.permissions);
    }
  }
  const channel = await Channels.findOne({
    groupId: groupId,
    id: channelId,
  });
  if (channel!.category) {
    const categoryPermissions = await CategoryPermissions.find({
      groupId: groupId,
      categoryId: channel!.category,
      roleId: { $in: ["everyone", ...user.role] },
    });
    if (categoryPermissions && categoryPermissions.length > 0) {
      for (const cp of categoryPermissions) {
        response.push(...cp.permissions);
      }
    }
  }
  return [...new Set(response)];
}

async function getGroupMemberServers(groupId: string) {
  const members = await Member.find({ groupId: groupId });
  const response = members.map((member) => member.userId.split("@")[1]);
  return [...new Set(response)];
}

export default app;
