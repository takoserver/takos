import app from "../foundation.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Message from "../models/message.ts";
import friends from "../models/friends.ts";
import request from "../models/request.ts";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import { fff } from "../utils/foundationReq.ts";
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
const env = await load();

app.post(
  "/message/send",
  zValidator(
    "json",
    z.object({
      senderId: z.string(),
      roomId: z.string(),
      messageId: z.string(),
      roomType: z.string(),
      eventId: z.string(),
      type: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { senderId, roomId, messageId, type, roomType } = c.req.valid("json");
    if (type !== "sendMessage") {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = senderId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (roomType == "friend") {
      const friend = await friends.findOne({
        userName: roomId,
        friendId: senderId,
      });
      if (!friend) {
        console.log("Unauthorized");
        return c.json({ message: "Unauthorized" }, 401);
      }
      if (messageId.split("@")[1] !== domain) {
        console.log("Unauthorized");
        return c.json({ message: "Unauthorized" }, 401);
      }
      const timestamp = new Date();
      await Message.create({
        roomId: roomId,
        messageid: messageId,
        userName: senderId,
        timestamp: timestamp,
      });
      publish({
        type: "message",
        users: [roomId],
        data: JSON.stringify({
          messageid: messageId,
          timestamp,
          tintin: "tintin",
          userName: senderId,
          roomid: senderId,
        }),
      });
      return c.json({ message: "success" });
    }
  },
);

import { cors } from "hono/cors";
import publish from "../utils/redisClient.ts";
app.use(cors(
  {
    origin: "*",
  },
));

app.get("/tako", (c) => {
  return c.json({ message: "tako" });
});

app.post(
  "/friend/request",
  zValidator(
    "json",
    z.object({
      senderId: z.string(),
      receiverId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { senderId, receiverId, type } = c.req.valid("json");
    if (type !== "friendRequest") {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = senderId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const friend = await friends.findOne({
      userName: receiverId,
      friends: senderId,
    });
    if (friend) {
      return c.json({ message: "Already friend" }, 400);
    }
    const isAlredyRequested = await request.findOne({
      sender: senderId,
      receiver: receiverId,
      type: "friend",
      id: uuidv7(),
    });
    if (isAlredyRequested) {
      return c.json({ message: "Already requested" }, 400);
    }
    await request.create({
      type: "friend",
      sender: senderId,
      receiver: receiverId,
      local: false,
      query: {},
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "friend/accept",
  zValidator(
    "json",
    z.object({
      senderId: z.string(),
      receiverId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { senderId, receiverId, type } = c.req.valid("json");
    if (type !== "friendAccept") {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    if (receiverId.split("@")[1] !== domain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const requestRes = await request.findOne({
      sender: senderId,
      receiver: receiverId,
      type: "friend",
    });
    if (!requestRes) {
      return c.json({ message: "Request not found" }, 404);
    }
    if (
      await friends.findOne({
        userName: requestRes.sender,
        friends: requestRes.receiver,
      })
    ) {
      return c.json({ message: "Already friend" }, 400);
    }
    await friends.create({
      userName: requestRes.sender,
      friendId: requestRes.receiver,
    });
    await request.deleteOne({
      id: requestRes.id,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/channel/create",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      id: z.string(),
      name: z.string(),
      permission: z.array(z.object({
        id: z.string(),
        permissions: z.array(z.string()),
      })),
      category: z.string().or(z.undefined()),
    }).strict(),
  ),
  async (c) => {
    const { groupId, userId, type, id, name, permission, category } = c.req
      .valid("json");
    if (type !== `createChannel`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const channel = await Channels.findOne({
      groupId: groupId,
      id: id,
    });
    if (channel) {
      return c.json({ message: "Channel already exists" }, 400);
    }
    const permissions = await getUserPermission(userId, groupId);
    if (!permissions.includes("MANAGE_CHANNEL")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (category) {
      const ca = await Category.findOne({
        groupId: groupId,
        id: category,
      });
      if (!ca) {
        return c.json({ message: "Category not found" }, 404);
      }
    }
    for (const role of permission) {
      const roleRes = await Roles.findOne({
        groupId: groupId,
        id: role.id,
      });
      if (!roleRes) {
        return c.json({ message: "Role not found" }, 404);
      }
    }
    await Channels.create({
      groupId: groupId,
      id: id,
      name: name,
      category: category,
    });
    for (const role of permission) {
      await ChannelPermissions.create({
        groupId: groupId,
        channelId: id,
        roleId: role.id,
        inheritCategoryPermissions: true,
        permissions: role.permissions,
      });
    }
    await fff(
      "group/notice/channel/create",
      JSON.stringify({
        groupId: groupId,
        type: `noticeCreateChannel`,
        eventId: uuidv7(),
        id: id,
        name: name,
        permission: permission,
        category: category,
      }),
      (await getGroupMemberServers(groupId)).filter((a) => a !== domain),
    );
    return c.json({ message: "success" });
  },
);

app.post(
  "group/channel/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      id: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { groupId, userId, type, id } = c.req.valid("json");
    if (type !== "deleteChannel") {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const channel = await Channels.findOne({
      groupId: groupId,
      id: id,
    });
    if (channel) {
      return c.json({ message: "Channel already exists" }, 400);
    }
    const permissions = await getUserPermission(userId, groupId);
    if (!permissions.includes("MANAGE_CHANNEL")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    await Channels.deleteOne({
      groupId: groupId,
      id: id,
    });
    await ChannelPermissions.deleteMany({
      groupId: groupId,
      channelId: id,
    });
    await fff(
      "group/notice/channel/create",
      JSON.stringify({
        groupId: groupId,
        userId: userId,
        type: `noticeDeleteChannel`,
        eventId: uuidv7(),
        id: id,
      }),
      (await getGroupMemberServers(groupId)).filter((a) => a !== domain),
    );
    return c.json({ message: "success" });
  },
);

app.post(
  "group/role/create",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      id: z.string(),
      name: z.string(),
      color: z.string(),
      permission: z.array(z.string()),
    }).strict(),
  ),
  async (c) => {
    const { groupId, userId, type, id, name, color, permission } = c.req.valid(
      "json",
    );
    if (type !== `createRole`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_ROLE")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    //自らのpermissionにないものがpermissionsに含まれているか
    for (const a of permission) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Roles.create({
      groupId: groupId,
      id: id,
      name: name,
      color: color,
      permissions: permission,
    });
    await fff(
      "group/notice/role/create",
      JSON.stringify({
        groupId: groupId,
        userId: userId,
        type: `noticeCreateRole`,
        eventId: uuidv7(),
        id: id,
        name: name,
        color: color,
        permissions: permission,
      }),
      (await getGroupMemberServers(groupId)).filter((a) => a !== domain),
    );
    return c.json({ message: "success" });
  },
);

app.post(
  "group/role/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      id: z.string(),
    }).strict(),
  ),
  async (c) => {
    const { groupId, userId, type, id } = c.req.valid("json");
    if (type !== `deleteRole`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_ROLE")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const role = await Roles.findOne({
      groupId: groupId,
      id: id,
    });
    if (!role) {
      return c.json({ message: "Role not found" }, 404);
    }
    for (const a of role.permissions) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Roles.deleteOne({
      groupId: groupId,
      id: id,
    });
    await ChannelPermissions.deleteMany({
      groupId: groupId,
      roleId: id,
    });
    await fff(
      "group/notice/role/delete",
      JSON.stringify({
        groupId: groupId,
        userId: userId,
        type: `noticeDeleteRole`,
        eventId: uuidv7(),
        id: id,
      }),
      (await getGroupMemberServers(groupId)).filter((a) => a !== domain),
    );
    return c.json({ message: "success" });
  },
);

app.post(
  "group/server/edit",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      name: z.string().or(z.undefined()),
      icon: z.string().or(z.undefined()),
      description: z.string().or(z.undefined()),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      name,
      icon,
      description,
    } = c.req.valid("json");
    if (type !== `editServer`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_SERVER")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const updateGroup = {
      name: group.groupName,
      icon: group.groupIcon,
      description: group.groupDescription,
    };
    if (name) {
      updateGroup.name = name;
    }
    if (icon) {
      const resizedIcon = arrayBufferToBase64(
        await resizeImageTo256x256(new Uint8Array(base64ToArrayBuffer(icon))),
      );
      updateGroup.icon = resizedIcon;
    }
    if (description) {
      updateGroup.description = description;
    }
    await Group.updateOne({
      groupId,
    }, updateGroup);
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/invite",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      inviteUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      inviteUserId,
    } = c.req.valid("json");
    if (type !== `inviteUser`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner || group.type !== "private") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("INVITE_USER") ||
      !userPermissions.includes("MANAGE_MEMBER")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const inviteUser = await Member.findOne({
      groupId: groupId,
      userId: inviteUserId,
    });
    if (inviteUser) {
      return c.json({ message: "User already exists" }, 400);
    }
    const memberDomain = inviteUserId.split("@")[1];
    if (!group.servers.includes(memberDomain)) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        invites: inviteUserId,
      },
    });
    await fff(
      "group/notice/user/invite",
      JSON.stringify({
        groupId: groupId,
        userId: userId,
        type: `noticeInviteUser`,
        eventId: uuidv7(),
        inviteUserId: inviteUserId,
      }),
      [memberDomain],
    );
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/accept",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      inviteUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      inviteUserId,
    } = c.req.valid("json");
    if (type !== `acceptJoin`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner || group.type !== "public") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_MEMBER")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const reqUser = await Member.findOne({
      groupId: groupId,
      userId: inviteUserId,
    });
    if (reqUser) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (!group.requests.includes(inviteUserId)) {
      return c.json({ message: "Request not found" }, 404);
    }
    const memberDomain = inviteUserId.split("@")[1];
    if (group.servers.length >= 100 && !group.servers.includes(memberDomain)) {
      return c.json({ message: "Server is full" }, 400);
    }
    if (!group.servers.includes(memberDomain)) {
      await Group.updateOne({
        groupId: groupId,
      }, {
        $push: {
          servers: memberDomain,
        },
      });
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        requests: inviteUserId,
      },
    });
    await Member.create({
      groupId: groupId,
      userId: inviteUserId,
    });
    await fff(
      "group/notice/user/join",
      JSON.stringify({
        groupId: groupId,
        userId: inviteUserId,
        type: `noticeAcceptUser`,
        eventId: uuidv7(),
      }),
      [memberDomain],
    );
  },
);

app.post(
  "group/user/reject",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      inviteUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      inviteUserId,
    } = c.req.valid("json");
    if (type !== `rejectJoin`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner || group.type !== "public") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_MEMBER")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const reqUser = await Member.findOne({
      groupId: groupId,
      userId: inviteUserId,
    });
    if (reqUser) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (!group.requests.includes(inviteUserId)) {
      return c.json({ message: "Request not found" }, 404);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        requests: inviteUserId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/server/add",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      server: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      server,
    } = c.req.valid("json");
    if (type !== `addServer`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner || group.type !== "public") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_MEMBER")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (group.servers.includes(server)) {
      return c.json({ message: "Server already exists" }, 400);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        servers: server,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/server/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      server: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      server,
    } = c.req.valid("json");
    if (type !== `deleteServer`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner || group.type !== "public") {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (!userPermissions.includes("MANAGE_MEMBER")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (group.servers.includes(server)) {
      return c.json({ message: "Server already exists" }, 400);
    }
    const members = await Member.find({
      groupId: groupId,
    });
    for (const member of members) {
      if (member.userId.split("@")[1] === server) {
        return c.json({ message: "Server has members" }, 400);
      }
    }
    if (group.servers.length >= 100) {
      return c.json({ message: "Server is full" }, 400);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        servers: server,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/invite/notification",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      inviteUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      inviteUserId,
    } = c.req.valid("json");
    if (type !== `inviteNotification`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (env["domain"] !== inviteUserId.split("@")[1]) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (
      await friends.findOne({
        userName: inviteUserId,
        friendId: userId,
      })
    ) {
      return c.json({ message: "Already friend" }, 400);
    }
    if (
      await request.findOne({
        sender: userId,
        receiver: inviteUserId,
        type: "groupInvite",
        query: groupId,
      })
    ) {
      return c.json({ message: "Already requested" }, 400);
    }
  },
);

app.post(
  "group/user/ban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      banUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      banUserId,
    } = c.req.valid("json");
    if (type !== `banUser`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("MANAGE_MEMBER") ||
      !userPermissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const banUser = await Member.findOne(
      {
        groupId: groupId,
        userId: banUserId,
      },
    );
    if (!banUser) {
      return c.json({ message: "User not found" }, 404);
    }
    //自らのpermissionにないものがpermissionsに含まれているか、また ADMIN が含まれているか
    const banUserPermissions = await getUserPermission(banUserId, groupId);
    if (banUserPermissions.includes("ADMIN")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    for (const a of banUserPermissions) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Member.deleteOne({
      groupId: groupId,
      userId: banUserId,
    });
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        ban: banUserId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/kick",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      banUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      banUserId,
    } = c.req.valid("json");
    if (type !== `kickUser`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("MANAGE_MEMBER") ||
      !userPermissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const banUser = await Member.findOne(
      {
        groupId: groupId,
        userId: banUserId,
      },
    );
    if (!banUser) {
      return c.json({ message: "User not found" }, 404);
    }
    //自らのpermissionにないものがpermissionsに含まれているか、また ADMIN が含まれているか
    const banUserPermissions = await getUserPermission(banUserId, groupId);
    if (banUserPermissions.includes("ADMIN")) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    for (const a of banUserPermissions) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Member.deleteOne({
      groupId: groupId,
      userId: banUserId,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/unban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      banUserId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      banUserId,
    } = c.req.valid("json");
    if (type !== `banUser`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("MANAGE_MEMBER") ||
      !userPermissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const banUser = await Group.findOne(
      {
        groupId: groupId,
        ban: banUserId,
      },
    );
    if (!banUser) {
      return c.json({ message: "User not found" }, 404);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        ban: banUserId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/role/add",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      addUserId: z.string(),
      roleId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      addUserId,
      roleId,
    } = c.req.valid("json");
    if (type !== `addUserRole`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("MANAGE_ROLE") ||
      !userPermissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const addUser = await Member.findOne(
      {
        groupId: groupId,
        userId: addUserId,
      },
    );
    if (!addUser) {
      return c.json({ message: "User not found" }, 404);
    }
    const role = await Roles.findOne({
      groupId: groupId,
      id: roleId,
    });
    if (!role) {
      return c.json({ message: "Role not found" }, 404);
    }
    //自らのpermissionにないものがpermissionsに含まれているか
    for (const a of role.permissions) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Member.updateOne({
      groupId: groupId,
      userId: addUserId,
    }, {
      $push: {
        role: roleId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/user/role/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
      deleteUserId: z.string(),
      roleId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
      roleId,
      deleteUserId,
    } = c.req.valid("json");
    if (type !== `deleteUserRole`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain !== userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (!isMember) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const userPermissions = await getUserPermission(userId, groupId);
    if (
      !userPermissions.includes("MANAGE_ROLE") ||
      !userPermissions.includes("ADMIN")
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const deleteUser = await Member.findOne(
      {
        groupId: groupId,
        userId: deleteUserId,
      },
    );
    if (!deleteUser) {
      return c.json({ message: "User not found" }, 404);
    }
    const role = await Roles.findOne({
      groupId: groupId,
      id: roleId,
    });
    if (!role) {
      return c.json({ message: "Role not found" }, 404);
    }
    //自らのpermissionにないものがpermissionsに含まれているか
    for (const a of role.permissions) {
      if (!userPermissions.includes(a)) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }
    await Member.updateOne({
      groupId: groupId,
      userId: deleteUserId,
    }, {
      $pull: {
        role: roleId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/join",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `joinGroup`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (
      !group || group.type !== "public" || !group.allowJoin || !group.isOwner
    ) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (isMember) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (!group.servers.includes(userDomain)) {
      return c.json({ message: "Server is full" }, 400);
    }
    await Member.create({
      groupId: groupId,
      userId: userId,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/join/request",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `requestJoinGroup`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || group.type !== "public" || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (isMember) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (group.servers.length >= 100 && !group.servers.includes(userDomain)) {
      return c.json({ message: "Server is full" }, 400);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        requests: userId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/join/cancel",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `requestJoinGroup`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || group.type !== "public" || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (isMember) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (group.servers.length >= 100 && !group.servers.includes(userDomain)) {
      return c.json({ message: "Server is full" }, 400);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $push: {
        requests: userId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/inivte/accept",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `acceptInvite`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || group.type !== "private" || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const isMember = await Member.findOne({
      groupId: groupId,
      userName: userId,
    });
    if (isMember) {
      return c.json({ message: "User already exists" }, 400);
    }
    if (!group.servers.includes(userDomain)) {
      return c.json({ message: "Server is full" }, 400);
    }
    if (!group.invites.includes(userId)) {
      return c.json({ message: "Invite not found" }, 404);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        invites: userId,
      },
    });
    await Member.create({
      groupId: groupId,
      userId: userId,
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/inivte/reject",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `rejectInvite`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || group.type !== "private" || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (!group.invites.includes(userId)) {
      return c.json({ message: "Invite not found" }, 404);
    }
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        invites: userId,
      },
    });
    return c.json({ message: "success" });
  },
);

app.post(
  "group/inivte/leave",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
      type: z.string(),
      eventId: z.string(),
    }).strict(),
  ),
  async (c) => {
    const {
      groupId,
      userId,
      type,
    } = c.req.valid("json");
    if (type !== `rejectInvite`) {
      return c.json({ message: "Invalid type" }, 400);
    }
    const domain = c.get("domain");
    const userDomain = userId.split("@")[1];
    if (domain === userDomain) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: groupId,
    });
    if (!group || !group.isOwner) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    if (!group.invites.includes(userId)) {
      return c.json({ message: "Invite not found" }, 404);
    }
    await Member.deleteOne({
      groupId: groupId,
      userId: userId,
    });
    await Group.updateOne({
      groupId: groupId,
    }, {
      $pull: {
        invites: userId,
      },
    });
    return c.json({ message: "success" });
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
