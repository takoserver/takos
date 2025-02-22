import app from "../foundation.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Message from "../models/message.ts";
import friends from "../models/friends.ts";
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
import publish from "../utils/redisClient.ts";
import { group } from "node:console";
import { handleReCreateGroup } from "../web/group.ts";
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

// t.friend.request
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
      userId: friendId,
      friendId: userId,
    });
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

// t.friend.cancel
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

// t.friend.accept
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

// t.message.send
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
      console.log(permission);
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
        },
      }),
      uniqueDomains,
    );
    //@ts-ignore
    console.log(await res[0].json());
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
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (member) {
      return c.json({ error: "Already member" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId);
      return c.json(200);
    }
    await Member.create({
      groupId: groupId,
      userId: userId,
      role: [],
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
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
      await handleReCreateGroup(groupId);
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
  "t.group.sync.role.assign",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    roleId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, userId, roleId } = payload;
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
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (!member) {
      return c.json({ error: "Not member" }, 400);
    }
    const role = await Roles.findOne({
      groupId: groupId,
      id: roleId,
    });
    if (!role) {
      return c.json({ error: "Not role" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId);
      return c.json(200);
    }
    await Member.updateOne({
      groupId: groupId,
      userId: userId,
    }, {
      $push: { role: roleId },
    });
    await Group.updateOne({ groupId }, { beforeEventId: eventId });
    return c.json(200);
  },
);

eventManager.add(
  "t.group.sync.role.unassign",
  z.object({
    groupId: z.string(),
    userId: z.string(),
    roleId: z.string(),
    beforeEventId: z.string(),
  }),
  async (c, payload) => {
    const domain = c.get("domain");
    const eventId = c.get("eventId");
    const { groupId, userId, roleId } = payload;
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
    const member = await Member.findOne({
      groupId: groupId,
      userId: userId,
    });
    if (!member) {
      return c.json({ error: "Not member" }, 400);
    }
    const role = await Roles.findOne({
      groupId: groupId,
      id: roleId,
    });
    if (!role) {
      return c.json({ error: "Not role" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId);
      return c.json(200);
    }
    await Member.updateOne({
      groupId: groupId,
      userId: userId,
    }, {
      $pull: { role: roleId },
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
      await handleReCreateGroup(groupId);
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
      await handleReCreateGroup(groupId);
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
    const category = await Category.findOne({
      groupId: groupId,
      id: categoryId,
    });
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId);
      return c.json(200);
    }
    if (category) {
      // 既存のカテゴリの場合は上書き更新
      await Category.updateOne(
        { groupId: groupId, id: categoryId },
        { category: categoryId },
      );
      // 既存の権限を削除し、新たに設定
      await CategoryPermissions.deleteMany({
        groupId: groupId,
        categoryId: categoryId
      });
      for (const permission of permissions) {
        await CategoryPermissions.create({
          groupId: groupId,
          categoryId: categoryId
        });
      }
    } else {
      // カテゴリが存在しない場合は新規作成
      await Category.create({
        groupId: groupId,
        id: categoryId,
      });
      for (const permission of permissions) {
        await CategoryPermissions.create({
          groupId: groupId,
          categoryId: categoryId
        });
      }
    }
    await Group
      .updateOne({ groupId }, { beforeEventId: eventId });
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
    const category = await Category.findOne({
      groupId: groupId,
      id: categoryId,
    });
    if (!category) {
      return c.json({ error: "Not category" }, 400);
    }
    if (group.beforeEventId !== payload.beforeEventId) {
      await handleReCreateGroup(groupId);
      return c.json(200);
    }
    await Category.deleteOne({
      groupId: groupId,
      id: categoryId,
    });
    await CategoryPermissions.deleteMany({
      groupId: groupId,
      categoryId: categoryId
    });
    await Group
      .updateOne({ groupId }, { beforeEventId: eventId });  
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
  if (!channelId) {
    return [...new Set(response)];
  }
  const channelPermissions = await ChannelPermissions.find({
    groupId: groupId,
    channelId: channelId,
    roleId: { $in: ["everyone", ...user.role] },
  });
  console.log(channelId);
  // channelPermissions は配列なので、各要素に対して permissions を追加する
  if (channelPermissions && channelPermissions.length > 0) {
    for (const cp of channelPermissions) {
      response.push(...cp.permissions);
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
