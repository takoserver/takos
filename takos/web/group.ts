import {
  Category,
  CategoryPermissions,
  ChannelPermissions,
  Channels,
  Group,
  JoinRequest,
  Member,
  Roles,
} from "../models/groups.ts";
import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Context, Hono } from "hono";
const app = new Hono<MyEnv>();
app.use("*", authorizationMiddleware);

import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { load } from "@std/dotenv";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "https://jsr.io/@takos/takos-encrypt-ink/5.3.2/utils/buffers.ts";
import { resizeImageTo256x256 } from "./sessions.ts";
import { fff } from "../utils/foundationReq.ts";
import request from "../models/request.ts";
import { getUserPermission } from "../foundation/server.ts";
import exp from "node:constants";
import { group } from "node:console";

const env = await load();

export default app;

app.post(
  "create",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      icon: z.string(),
      groupid: z.string().optional(),
      isPublic: z.boolean(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { name, icon, groupid, isPublic } = c.req.valid("json");
    const domain = env["domain"];
    const id = groupid || uuidv7();
    const groupId = id + "@" + domain;
    try {
      const resizedIcon = await resizeImageTo256x256(
        new Uint8Array(base64ToArrayBuffer(icon)),
      );
      const buffer = resizedIcon.buffer;
      await Group.create({
        groupId,
        groupName: name,
        groupIcon: arrayBufferToBase64(buffer as ArrayBuffer),
        type: isPublic ? "public" : "private",
        owner: user.userName + "@" + env["domain"],
        isOwner: true,
        defaultChannelId: "general",
        allowJoin: false,
      });
    } catch (error) {
      console.error("Error resizing image:", error);
      return c.json({ message: "Error resizing image" }, 500);
    }
    await Channels.create({
      id: "general",
      name: "general",
      groupId: groupId,
    });
    await ChannelPermissions.create({
      groupId,
      channelId: "general",
      roleId: "everyone",
      permissions: [`SEND_MESSAGE`, `READ_MESSAGE`],
    });
    await Member.create({
      groupId,
      userId: user.userName + "@" + env["domain"],
      role: [],
    });
    await Roles.create({
      groupId,
      id: "everyone",
      name: "everyone",
      color: "#000000",
      permissions: [],
    });
    return c.json({ groupId });
  },
);

app.post(
  "invite",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      })
    ) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (await Member.findOne({ groupId, userId })) {
      return c.json({ message: "Already exists" }, 400);
    }
    if (group.type !== "private") {
      return c.json({ message: "Invalid group type" }, 400);
    }
    if (group.invites.includes(userId)) {
      return c.json({ message: "Already invited" }, 400);
    }
    if (group.isOwner) {
      const permissions = await getUserPermission(
        user.userName + "@" + env["domain"],
        groupId,
      );
      if (
        !permissions ||
        !permissions.includes("INVITE_USER") && !permissions.includes("ADMIN")
      ) {
        return c.json({ message: "Unauthorized permission" }, 401);
      }
      await Group.updateOne({ groupId }, {
        $push: { invites: userId },
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.invite.send",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            inviteUserId: userId,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        //@ts-ignore
        console.log(await res[0].json());
        return c.json({ message: "Error inviting user1" }, 500);
      }
    }
    if (userId.split("@")[1] !== env["domain"]) {
      const res = await fff(
        JSON.stringify({
          event: "t.friend.group.invite",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            inviteUserId: userId,
          },
        }),
        [userId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        //@ts-ignore
        console.log(await res[0].json());
        return c.json({ message: "Error inviting user2" }, 500);
      }
    } else {
      await request.create({
        sender: user.userName + "@" + env["domain"],
        receiver: userId,
        type: "groupInvite",
        local: false,
        query: groupId,
      });
    }
    return c.json({ message: "success" });
  },
);

app.post(
  "leave",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    const domains = (await Member.find({ groupId })).map((member) =>
      member.userId.split("@")[1]
    ).filter((domain) => domain !== env["domain"]);
    const uniqueDomains = Array.from(new Set(domains));
    if (!group.isOwner) {
      const res = await fff(
        JSON.stringify({
          event: "t.group.leave",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (!(Array.isArray(res) && res[0].status === 200)) {
        //@ts-ignore
        console.log(await res[0].json(), uniqueDomains);
        return c.json({ message: "Error leaving group" }, 500);
      }
      await Member.deleteOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      });
      return c.json({ message: "success" });
    }
    if (group.owner === user.userName + "@" + env["domain"]) {
      return c.json({ message: "You can't leave the group" }, 400);
    }
    await Member.deleteOne({
      groupId,
      userId: user.userName + "@" + env["domain"],
    });
    const eventId = uuidv7();
    const res = await fff(
      JSON.stringify({
        event: "t.group.sync.user.remove",
        eventId: eventId,
        payload: {
          groupId,
          userId: user.userName + "@" + env["domain"],
          beforeEventId: group.beforeEventId,
        },
      }),
      uniqueDomains,
    );
    await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
    return c.json({ message: "success" });
  },
);

async function handleLocalGroupAccept(
  c: any,
  group: any,
  groupId: string,
  currentUser: string,
) {
  if (await Member.findOne({ groupId, userId: currentUser })) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  if (group.type !== "private") {
    return c.json({ message: "Invalid group type" }, 400);
  }
  if (!group.invites.includes(currentUser)) {
    return c.json({ message: "Invalid request" }, 400);
  }
  await Group.updateOne({ groupId }, { $pull: { invites: currentUser } });
  await Member.create({ groupId, userId: currentUser, role: [] });
  await request.deleteOne({
    sender: group.owner,
    receiver: currentUser,
    type: "groupInvite",
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
        userId: currentUser,
        beforeEventId: group.beforeEventId,
      },
    }),
    uniqueDomains.filter((domain) => domain !== currentUser.split("@")[1]),
  );
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  return c.json({ message: "success" });
}

/**
 * リモートグループのデータを新規作成する
 */
export async function createRemoteGroup(
  groupId: string,
  resJson: any,
  allowLocalUsers: string[],
  eventId?: string,
) {
  await Group.create({
    groupId,
    type: resJson.type,
    owner: resJson.owner,
    isOwner: false,
    defaultChannelId: resJson.defaultChannel,
    channelOrder: resJson.order,
    order: resJson.order,
    beforeEventId: eventId || resJson.beforeEventId,
  });
  for (const channel of resJson.channels.channels) {
    console.log(channel);
    await Channels.create({
      id: channel.id,
      name: channel.name,
      groupId,
      order: channel.order,
      category: channel.category,
    });
    console.log("channel.permissions", channel.permissions);
    for (const permission of channel.permissions) {
      await ChannelPermissions.create({
        groupId,
        channelId: channel.id,
        roleId: permission.roleId,
        permissions: permission.permissions,
      });
    }
  }
  for (const category of resJson.channels.categories) {
    await Category.create({
      id: category.id,
      name: category.name,
      groupId,
    });
    for (const permission of category.permissions) {
      await CategoryPermissions.create({
        groupId,
        categoryId: category.id,
        roleId: permission.roleId,
        permissions: permission.permissions,
      });
    }
  }
  for (const role of resJson.roles) {
    await Roles.create({
      groupId,
      id: role.id,
      name: role.name,
      color: role.color,
      permissions: role.permission,
    });
  }
  for (const member of resJson.members) {
    if(!allowLocalUsers.includes(member.userId)){
      continue;
    }
    await Member.create({
      groupId,
      userId: member.userId,
      role: member.role,
    });
  }
}

export async function handleReCreateGroup(groupId: string, eventId: string) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return;
  }
  const groupDomain = groupId.split("@")[1];
  if (group.isOwner) {
    return;
  }
  const members = (await Member.find({ groupId })).map((member) => {
    return member.userId;
  }).filter((userId) => userId.split("@")[1] === env["domain"]);
  //groupのデータを削除
  await Group.deleteOne({
    groupId,
  });
  await Channels.deleteMany({
    groupId,
  });
  await ChannelPermissions.deleteMany({
    groupId,
  });
  await Category.deleteMany({
    groupId,
  });
  await CategoryPermissions.deleteMany({
    groupId,
  });
  await Roles.deleteMany({
    groupId,
  });
  await Member.deleteMany({
    groupId,
  });
  //groupのデータを再作成
  await createRemoteGroup(
    groupId,
    await fetch(`https://${groupDomain}/_takos/v1/group/all/${groupId}`).then((
      res,
    ) => res.json()),
    members,
    eventId,
  );
}

app.post(
  "accept",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    const currentUser = `${user.userName}@${env["domain"]}`;
    const group = await Group.findOne({ groupId });
    const groupDomain = groupId.split("@")[1];
    // ローカルグループの場合
    if (group && group.isOwner) {
      return await handleLocalGroupAccept(c, group, groupId, currentUser);
    }
    // グループが存在しない場合、またはリモートグループの場合
    // 自ドメインのグループの場合エラー
    if (groupDomain === env["domain"]) {
      return c.json({ message: "Invalid group" }, 400);
    }
    try {
      const res = await fff(
        JSON.stringify({
          event: "t.group.invite.accept",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: currentUser,
          },
        }),
        [groupDomain],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error accepting group2" }, 500);
      }
      let groupData: Response | undefined;
      if (!group) {
        groupData = await fetch(
          `https://${groupDomain}/_takos/v1/group/all/${groupId}`,
        );
        if (groupData.status !== 200) {
          return c.json({ message: "Error accepting group3" }, 500);
        }
        await createRemoteGroup(groupId, await groupData.json(), [currentUser]);
        if(await Member.findOne({groupId, userId: currentUser})){
          return c.json({ message: "success" });
        } else {
          await Member.create({
            groupId,
            userId: currentUser,
            role: [],
          });
          return c.json({ message: "success" });
        }
      } else {
        await Member.create({
          groupId,
          userId: currentUser,
          role: [],
        });
      }
      return c.json({ message: "success" });
    } catch (error) {
      console.error("Error accepting group:", error);
      return c.json({ message: "Error accepting group1" }, 500);
    }
  },
);

app.post(
  "channel/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      channelId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, channelId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      const permission = await getUserPermission(
        user.userName + "@" + env["domain"],
        c.req.valid("json").groupId,
      );
      if (!permission) {
        return c.json({ message: "Unauthorized1" }, 401);
      }
      if (
        !permission.includes(`MANAGE_CHANNEL`) && !permission.includes(`ADMIN`)
      ) {
        return c.json({ message: "Unauthorized permission" }, 401);
      }
      await handleRemoveChannel({
        groupId,
        channelId,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.channel.remove",
          eventId: uuidv7(),
          payload: {
            groupId: groupId,
            userId: user.userName + "@" + env["domain"],
            channelId: channelId,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error removing channel" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleRemoveChannel(
  {
    groupId,
    channelId,
    beforeEventId,
  }: {
    groupId: string;
    channelId: string;
    beforeEventId: string;
  },
) {
  await Channels.deleteOne({ id: channelId, groupId });
  await ChannelPermissions.deleteMany({ channelId, groupId });
  const MembersDomain = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.channel.remove",
      eventId: eventId,
      payload: {
        groupId: groupId,
        channelId: channelId,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
}

app.post(
  "channel/add",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      name: z.string(),
      id: z.string(),
      categoryId: z.string(),
      permissions: z.array(z.object({
        roleId: z.string(),
        permissions: z.array(z.string()),
      })),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, name, id, categoryId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      const permission = await getUserPermission(
        user.userName + "@" + env["domain"],
        c.req.valid("json").groupId,
      );
      if (!permission) {
        return c.json({ message: "Unauthorized1" }, 401);
      }
      if (
        !permission.includes(`MANAGE_CHANNEL`) && !permission.includes(`ADMIN`)
      ) {
        return c.json({ message: "Unauthorized permission" }, 401);
      }
      if (categoryId) {
        if (!await Category.findOne({ id: categoryId, groupId })) {
          return c.json({ message: "Invalid categoryId" }, 400);
        }
      }
      await handleAddChannel({
        groupId,
        name,
        id,
        categoryId,
        permissions: c.req.valid("json").permissions,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.channel.add",
          eventId: uuidv7(),
          payload: {
            groupId: groupId,
            userId: user.userName + "@" + env["domain"],
            channelName: name,
            channelId: id,
            categoryId: categoryId,
            permissions: c.req.valid("json").permissions,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error adding channel" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleAddChannel(
  { groupId, name, id, categoryId, permissions, beforeEventId }: {
    groupId: string;
    name: string;
    id: string;
    categoryId: string;
    permissions: { roleId: string; permissions: string[] }[];
    beforeEventId: string;
  },
) {
  const channel = await Channels.findOne({ id, groupId });
  if (channel) {
    //上書き
    await Channels.updateOne({ id }, { name, category: categoryId });
  } else {
    await Channels.create({ id, name, groupId, category: categoryId });
  }
  await Channels.updateOne({ id }, { name, category: categoryId });
  await ChannelPermissions.deleteMany({ channelId: id, groupId });
  if (permissions) {
    for (const roleId of permissions ?? []) {
      await ChannelPermissions.create({
        groupId,
        channelId: id,
        roleId: roleId.roleId,
        permissions: roleId.permissions,
      });
    }
  }
  const MembersDomain = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.channel.add",
      eventId: eventId,
      payload: {
        groupId: groupId,
        channelId: id,
        name,
        category: categoryId,
        permissions: permissions,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
  return;
}

app.post(
  "category/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      categoryId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, categoryId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    const member = await Member.findOne({
      groupId,
      userId: user.userName + "@" + env["domain"],
    });
    if (!member) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      const permission = await getUserPermission(
        user.userName + "@" + env["domain"],
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
      const category = await Category.findOne({ id: categoryId, groupId });
      if (!category) {
        return c.json({ message: "Invalid categoryId" }, 400);
      }
      await handleRemoveCategory({
        groupId,
        categoryId,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.category.remove",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            categoryId,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error removing category" }, 500);
      }
      console.log("success");
      return c.json({ message: "success" });
    }
  },
);

export async function handleRemoveCategory(
  { groupId, categoryId, beforeEventId }: {
    groupId: string;
    categoryId: string;
    beforeEventId: string;
  },
) {
  await Category.deleteOne({ id: categoryId, groupId });
  await CategoryPermissions.deleteMany({ categoryId, groupId });
  const MembersDomain = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.category.remove",
      eventId: eventId,
      payload: {
        groupId,
        categoryId,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
}

app.post(
  "category/add",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      name: z.string(),
      id: z.string(),
      permissions: z.array(
        z.object({
          roleId: z.string(),
          permissions: z.array(z.string()),
        }),
      ),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, name, id } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      const permission = await getUserPermission(
        user.userName + "@" + env["domain"],
        c.req.valid("json").groupId,
      );
      if (!permission) {
        return c.json({ message: "Unauthorized1" }, 401);
      }
      if (
        !permission.includes(`MANAGE_CHANNEL`) && !permission.includes(`ADMIN`)
      ) {
        return c.json({ message: "Unauthorized permission" }, 401);
      }
      await handleAddCategory({
        groupId,
        name,
        id,
        permissions: c.req.valid("json").permissions,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.category.add",
          eventId: uuidv7(),
          payload: {
            groupId: groupId,
            userId: user.userName + "@" + env["domain"],
            categoryName: name,
            categoryId: id,
            permissions: c.req.valid("json").permissions,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        //@ts-ignore
        console.log(await res[0].json());
        return c.json({ message: "Error adding category" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleAddCategory(
  { groupId, name, id, permissions, beforeEventId }: {
    groupId: string;
    name: string;
    id: string;
    permissions: { roleId: string; permissions: string[] }[];
    beforeEventId: string;
  },
) {
  const category = await Category.findOne({ id, groupId });
  if (category) {
    await Category.updateOne({ id }, { name });
  } else {
    await Category.create({ id, name, groupId });
  }
  await Category.updateOne({ id }, { name });
  await CategoryPermissions.deleteMany({ categoryId: id, groupId });
  if (permissions) {
    for (const roleId of permissions ?? []) {
      await CategoryPermissions.create({
        groupId,
        categoryId: id,
        roleId: roleId.roleId,
        permissions: roleId.permissions,
      });
    }
  }
  const MembersDomain = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.category.add",
      eventId: eventId,
      payload: {
        groupId: groupId,
        categoryId: id,
        name,
        permissions: permissions,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
  return;
}

app.post(
  "role/add",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      name: z.string(),
      id: z.string(),
      color: z.string(),
      permissions: z.array(z.string()),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, name, id, color, permissions } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (
      !await Member.findOne({
        groupId,
        userId: user.userName + "@" + env["domain"],
      })
    ) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      return await handleAddRole({
        groupId,
        userId: user.userName + "@" + env["domain"],
        name,
        id,
        color,
        permissions,
        context: c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.role.add",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            roleName: name,
            roleId: id,
            color,
            permissions,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error adding role" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleAddRole({
  groupId,
  userId,
  name,
  id,
  color,
  permissions,
  context,
}: {
  groupId: string;
  userId: string;
  name: string;
  id: string;
  color: string;
  permissions: string[];
  context: Context;
}) {
  const c = context;
  const permission = await getUserPermission(
    userId,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  const role = await Roles.findOne({ id, groupId });
  if (role) {
    await Roles.updateOne({ id, groupId }, { name, color, permissions });
  } else {
    await Roles.create({ id, name, color, permissions, groupId });
  }
  return c.json({ message: "success" });
}

app.post(
  "role/delete",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      roleId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, roleId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    const member = await Member.findOne({
      groupId,
      userId: user.userName + "@" + env["domain"],
    });
    if (!member) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      return await handleRemoveRole({
        groupId,
        roleId,
        userId: user.userName + "@" + env["domain"],
        beforeEventId: group.beforeEventId!,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.role.remove",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            roleId,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error removing role" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleRemoveRole({
  groupId,
  roleId,
  userId,
  beforeEventId,
  c,
}: {
  groupId: string;
  roleId: string;
  userId: string;
  c: Context;
  beforeEventId: string;
}) {
  if (roleId === "everyone") {
    return c.json({ message: "Invalid roleId" }, 400);
  }
  const role = await Roles.findOne({ id: roleId, groupId });
  if (!role) {
    return c.json({ message: "Invalid roleId" }, 400);
  }
  const permission = await getUserPermission(
    userId,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Roles.deleteOne({ id: roleId, groupId });
  await Member.updateMany({ groupId }, { $pull: { role: roleId } });
  const MembersDomain = (await Member.find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.role.remove",
      eventId: eventId,
      payload: {
        groupId,
        roleId,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
  return c.json({ message: "success" });
}

app.post(
  "user/role",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      roleId: z.array(z.string()),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    const { groupId, roleId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }

    const member = await Member.findOne({
      groupId,
      userId: user.userName + "@" + env["domain"],
    });
    if (!member) {
      return c.json({ message: "Unauthorized2" }, 401);
    }
    if (group.isOwner) {
      return await handleGiveRole({
        groupId,
        roleId,
        userId: user.userName + "@" + env["domain"],
        targetUserId: c.req.valid("json").userId,
        beforeEventId: group.beforeEventId!,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.user.role",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            assignUserId: c.req.valid("json").userId,
            roleId,
          },
        }),
        [group.groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error giving role" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleGiveRole({
  groupId,
  roleId,
  userId,
  targetUserId,
  beforeEventId,
  c,
}: {
  groupId: string;
  roleId: string[];
  userId: string;
  c: Context;
  targetUserId: string;
  beforeEventId: string;
}) {
  const permission = await getUserPermission(
    userId,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Member.updateOne({ groupId, userId: targetUserId }, {
    role: roleId,
  });
  const MembersDomain = (await Member.find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.role.assign",
      eventId: eventId,
      payload: {
        groupId,
        userId: targetUserId,
        roleId: roleId,
        beforeEventId: beforeEventId,
      },
    }),
    uniqueDomains,
  );
  return c.json({ message: "success" });
}

app.post(
  "join/request",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      const group = await Group.findOne({ groupId });
      if (!group) {
        return c.json({ message: "Invalid groupId" }, 400);
      }
      if (group.type == "private") {
        return c.json({ message: "Invalid group type" }, 400);
      }
      if(group.allowJoin == true
      ){
        return c.json({ message: "Group is not accepting join requests" }, 400);
      }
      
      if (
        await Member.findOne({
          groupId,
          userId: user.userName + "@" + env["domain"],
        })
      ) {
        return c.json({ message: "Already a member" }, 400);
      }
      if (group.requests.includes(user.userName + "@" + env["domain"])) {
        return c.json({ message: "Already requested" }, 400);
      }
      await Group.updateOne({ groupId }, {
        $push: { requests: user.userName + "@" + env["domain"] },
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.join.request",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error requesting group" }, 500);
      }
      await JoinRequest.create({
        groupId,
        userId: user.userName + "@" + env["domain"],
      });
      return c.json({ message: "success" });
    }
  },
);

app.post(
  "join/accept",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return handleAcceptJoinRequest({
        c,
        groupId,
        userId,
        accepter: user.userName + "@" + env["domain"],
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.join.accept",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            targetUserId: userId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error accepting group" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleAcceptJoinRequest({
  c,
  groupId,
  userId,
  accepter,
}: {
  c: Context;
  groupId: string;
  userId: string;
  accepter: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  if (group.type == "private") {
    return c.json({ message: "Invalid group type" }, 400);
  }
  if (!group.requests.includes(userId)) {
    return c.json({ message: "Invalid request" }, 400);
  }
  if (
    await Member
      .findOne({ groupId, userId: userId })
  ) {
    return c.json({ message: "Already a member" }, 400);
  }
  if (
    !await Member
      .findOne({ groupId, userId: accepter })
  ) {
    return c.json({ message: "you are not a member" }, 400);
  }
  const permission = await getUserPermission(
    accepter,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_USER`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  if (userId.split("@")[1] !== env["domain"]) {
    const eventId = uuidv7();
    const res = await fff(
      JSON.stringify({
        event: "t.friend.group.accept",
        eventId: eventId,
        payload: {
          groupId,
          userId: userId,
        },
      }),
      [userId.split("@")[1]],
    );
    if (Array.isArray(res) ? res[0].status !== 200 : true) {
      return c.json({ message: "Error accepting group" }, 500);
    }
  }

  await Group.updateOne({ groupId }, { $pull: { requests: userId } });
  await Member.create({ groupId, userId, role: [] });

  const domains = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(domains));
  const eventId = uuidv7();
  await fff(
    JSON.stringify({
      event: "t.group.sync.user.add",
      eventId: eventId,
      payload: {
        groupId,
        userId,
        role: [],
        beforeEventId: group.beforeEventId,
      },
    }),
    uniqueDomains.filter((domain) => domain !== userId.split("@")[1]),
  );
  return c.json({ message: "success" });
}

app.post(
  "join",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleJoinGroup({
        c,
        groupId,
        userId: user.userName + "@" + env["domain"],
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.join",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error joining group" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleJoinGroup({
  c,
  groupId,
  userId
}: {
  c: Context;
  groupId: string;
  userId: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  if (group.type == "private") {
    return c.json({ message: "Invalid group type" }, 400);
  }
  if (group.allowJoin == false) {
    return c.json({ message: "Not allowed to join" }, 400);
  }
  if (
    await Member.findOne({
      groupId,
      userId: userId,
    })
  ) {
    return c.json({ message: "Already a member" }, 400);
  }
  await Member.create({
    groupId,
    userId: userId,
    role: [],
  });
  const domains = (await Member
    .find({ groupId }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"])
    .filter((domain) => domain !== userId.split("@")[1]);
  const uniqueDomains = Array.from(new Set(domains));
  const eventId = uuidv7();
  await fff(
    JSON.stringify({
      event: "t.group.sync.user.add",
      eventId: eventId,
      payload: {
        groupId,
        userId: userId,
        role: [],
        beforeEventId: group.beforeEventId,
      },
    }),
    uniqueDomains
  );
  return c.json({ message: "success" });
}

app.post(
  "join/remove",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      const group = await Group.findOne({ groupId });
      if (!group) {
        return c.json({ message: "Invalid groupId" }, 400);
      }
      if (group.type !== "private") {
        return c.json({ message: "Invalid group type" }, 400);
      }
      if (!group.requests.includes(userId)) {
        return c.json({ message: "Invalid request" }, 400);
      }
      await Group.updateOne({ groupId }, { $pull: { requests: userId } });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.join.remove",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            requestUserId: userId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error removing group" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

app.post(
  "join/cancel",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      const group = await Group.findOne({ groupId });
      if (!group) {
        return c.json({ message: "Invalid groupId" }, 400);
      }
      if (group.type !== "private") {
        return c.json({ message: "Invalid group type" }, 400);
      }
      if (!group.requests.includes(user.userName + "@" + env["domain"])) {
        return c.json({ message: "Invalid request" }, 400);
      }
      await Group.updateOne({ groupId }, {
        $pull: { requests: user.userName + "@" + env["domain"] },
      });
      return c.json({ message: "success" });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.join.cancel",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error canceling group" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

app.post(
  "/kick",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleKickUser({
        groupId,
        userId,
        c: c,
        kikker: user.userName + "@" + env["domain"],
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.kick",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            targetUserId: userId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error kicking user" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleKickUser({
  groupId,
  userId,
  c,
  kikker,
}: {
  groupId: string;
  userId: string;
  c: Context;
  kikker: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  if (
    !await Member
      .findOne({ groupId, userId })
  ) {
    return c.json({ message: "Not a member" }, 400);
  }
  if (group.owner === userId) {
    return c.json({ message: "Cannot ban kick" }, 400);
  }
  const permission = await getUserPermission(
    kikker,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_USER`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Member
    .deleteOne({ groupId, userId });
  const MembersDomain = (await Member
    .find({
      groupId,
    }))
    .map((member) => member.userId.split("@")[1])
    .filter((domain) => domain !== env["domain"]);
  const uniqueDomains = Array.from(new Set(MembersDomain));
  const eventId = uuidv7();
  await Group
    .updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  await fff(
    JSON.stringify({
      event: "t.group.sync.user.remove",
      eventId: eventId,
      payload: {
        groupId,
        userId,
        beforeEventId: group.beforeEventId!,
      },
    }),
    uniqueDomains,
  );
  return c.json({ message: "success" });
}

app.post(
  "/ban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleBanUser({
        groupId,
        userId,
        c: c,
        bannner: user.userName + "@" + env["domain"],
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.ban",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            targetUserId: userId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error banning user" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleBanUser({
  groupId,
  userId,
  c,
  bannner,
}: {
  groupId: string;
  userId: string;
  c: Context;
  bannner: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    bannner,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_USER`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  if (group.owner === userId) {
    return c.json({ message: "Cannot ban owner" }, 400);
  }
  if (group.ban.includes(userId)) {
    return c.json({ message: "Already banned" }, 400);
  }
  if (
    await Member
      .findOne({ groupId, userId })
  ) {
    await Member
      .deleteOne({ groupId, userId });
    await Group.updateOne({ groupId }, { $push: { ban: userId } });
    const MembersDomain = (await Member
      .find({ groupId }))
      .map((member) => member.userId.split("@")[1])
      .filter((domain) => domain !== env["domain"]);
    const uniqueDomains = Array.from(new Set(MembersDomain));
    const eventId = uuidv7();
    await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
    await fff(
      JSON.stringify({
        event: "t.group.sync.user.remove",
        eventId: eventId,
        payload: {
          groupId,
          userId,
          beforeEventId: group.beforeEventId!,
        },
      }),
      uniqueDomains,
    );
  }
  return c.json({ message: "success" });
}

app.post(
  "unban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleUnbanUser({
        groupId,
        userId,
        c,
        unbanner: user.userName + "@" + env["domain"],
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.unban",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            targetUserId: userId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error unbanning user" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleUnbanUser({
  groupId,
  userId,
  c,
  unbanner,
}: {
  groupId: string;
  userId: string;
  c: Context;
  unbanner: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  if (!group.ban.includes(userId)) {
    return c.json({ message: "Not banned" }, 400);
  }
  const permission = await getUserPermission(
    unbanner,
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_USER`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Group.updateOne({ groupId }, { $pull: { ban: userId } });
  return c.json({ message: "success" });
}

app.post(
  "settings",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      allowJoin: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, name, description, icon, allowJoin } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleSettings({
        groupId,
        name,
        description,
        icon,
        allowJoin,
        c,
        userId: user.userName + "@" + env["domain"],
      });
    } else {
      if(!(name !== undefined || icon !== undefined || description !== undefined || allowJoin !== undefined)) {
        return c.json({ message: "No changes specified" }, 400);
      }
      const res = await fff(
        JSON.stringify({
          event: "t.group.settings",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            name,
            description,
            icon,
            allowJoin,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error changing settings" }, 500);
      }
      return c.json({ message: "success" });
    }
  }
)

export async function handleSettings({
  groupId,
  name,
  description,
  icon,
  allowJoin,
  c,
  userId,
}: {
  groupId: string;
  name: string | undefined;
  description: string | undefined;
  icon: string | undefined;
  allowJoin: boolean | undefined;
  c: Context;
  userId: string;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    userId,
    groupId,
  );
  if(!(name !== undefined || icon !== undefined || description !== undefined || allowJoin !== undefined)) {
    return c.json({ message: "No changes specified" }, 400);
  }
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_GROUP`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  if (name) {
    await Group.updateOne({ groupId }, { $set: { groupName: name } });
  }
  if (icon) {
    const resizedIcon = await resizeImageTo256x256(
      new Uint8Array(base64ToArrayBuffer(icon)),
    );
    const buffer = resizedIcon.buffer;
    await Group.updateOne({ groupId }, { $set: { groupIcon: arrayBufferToBase64(buffer as ArrayBuffer) } });
  }
  if (allowJoin !== undefined) {
    await Group.updateOne({ groupId }, { $set: { allowJoin } });
  }
  await Group.updateOne({ groupId }, { $set: { groupDescription: description } });
  return c.json({ message: "success" });
}

app.post(
  "channel/default",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      channelId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, channelId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleSetDefaultChannel({
        groupId,
        channelId,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.channel.default",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            channelId,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error setting default channel" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleSetDefaultChannel({
  groupId,
  channelId,
  c,
}: {
  groupId: string;
  channelId: string;
  c: Context;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  if (
    !await Channels.findOne({ groupId, id: channelId })
  ) {
    return c.json({ message: "Invalid channelId" }, 400);
  }
  const permission = await getUserPermission(
    c.get("user").userName + "@" + env["domain"],
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_CHANNEL`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Group.updateOne({ groupId }, { $set: { defaultChannelId: channelId } });
  return c.json({ message: "success" });
}

app.post(
  "user/owner",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, userId } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      if (userId.split("@")[1] !== env["domain"]) {
        return c.json({ message: "Invalid userId" }, 400);
      }
      const group = await Group.findOne({ groupId });
      if (!group) {
        return c.json({ message: "Invalid groupId" }, 400);
      }
      if (
        !await Member
          .findOne({ groupId, userId })
      ) {
        return c.json({ message: "Not a member" }, 400);
      }
      if (group.owner === userId) {
        return c.json({ message: "Already owner" }, 400);
      }
      await Group.updateOne({ groupId }, { $set: { owner: userId } });
      await fff(
        JSON.stringify({
          event: "t.group.sync.owner",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId,
          },
        }),
        [userId.split("@")[1]],
      );
      return c.json({ message: "success" });
    } else {
      return c.json({ message: "Unauthorized" }, 401);
    }
  },
);

app.post(
  "channel/order",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      order: z.array(z.object({
        type: z.string(),
        id: z.string(),
      })),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, order } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleChannelOrder({
        groupId,
        order,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.channel.order",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            order,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error setting channel order" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleChannelOrder({
  groupId,
  order,
  c,
}: {
  groupId: string;
  order: { type: string; id: string }[];
  c: Context;
}) {
  const group = await Group.findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    c.get("user").userName + "@" + env["domain"],
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_CHANNEL`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  const channels = await Channels.find({ groupId });
  const channelIds = channels.map((channel) => channel.id);
  if (order.length !== channelIds.length) {
    return c.json({ message: "Invalid order" }, 400);
  }
  for (const o of order) {
    if (!channelIds.includes(o.id)) {
      return c.json({ message: "Invalid order" }, 400);
    }
  }
  await Group
    .updateOne({ groupId }, { $set: { channelOrder: order } });
  return c.json({ message: "success" });
}

app.post(
  "icon",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      icon: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, icon } = c.req.valid("json");
    const resizedIcon = arrayBufferToBase64(
      (await resizeImageTo256x256(
        new Uint8Array(base64ToArrayBuffer(icon)),
      )).buffer as ArrayBuffer,
    );
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleIcon({
        groupId,
        icon: resizedIcon,
        c,
        islocal: true,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.icon",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            icon: resizedIcon,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error setting icon" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleIcon({
  groupId,
  icon,
  c,
  islocal,
}: {
  groupId: string;
  icon: string;
  c: Context;
  islocal: boolean;
}) {
  const group = await Group
    .findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    c.get("user").userName + "@" + env["domain"],
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_GROUP`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  if (islocal) {
    await Group
      .updateOne({ groupId }, { $set: { icon } });
  } else {
    const resizedIcon = arrayBufferToBase64(
      (await resizeImageTo256x256(
        new Uint8Array(base64ToArrayBuffer(icon)),
      )).buffer as ArrayBuffer,
    );
    await Group
      .updateOne({ groupId }, { $set: { icon: resizedIcon } });
  }
  return c.json({ message: "success" });
}

app.post(
  "description",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      description: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, description } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleDescription({
        groupId,
        description,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.description",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            description,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error setting description" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleDescription({
  groupId,
  description,
  c,
}: {
  groupId: string;
  description: string;
  c: Context;
}) {
  const group = await Group
    .findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    c.get("user").userName + "@" + env["domain"],
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_GROUP`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Group
    .updateOne({ groupId }, { $set: { description } });
  return c.json({ message: "success" });
}

app.post(
  "name",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      name: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId, name } = c.req.valid("json");
    if (groupId.split("@")[1] === env["domain"]) {
      return await handleName({
        groupId,
        name,
        c,
      });
    } else {
      const res = await fff(
        JSON.stringify({
          event: "t.group.name",
          eventId: uuidv7(),
          payload: {
            groupId,
            userId: user.userName + "@" + env["domain"],
            name,
          },
        }),
        [groupId.split("@")[1]],
      );
      if (Array.isArray(res) ? res[0].status !== 200 : true) {
        return c.json({ message: "Error setting name" }, 500);
      }
      return c.json({ message: "success" });
    }
  },
);

export async function handleName({
  groupId,
  name,
  c,
}: {
  groupId: string;
  name: string;
  c: Context;
}) {
  const group = await Group
    .findOne({ groupId });
  if (!group) {
    return c.json({ message: "Invalid groupId" }, 400);
  }
  const permission = await getUserPermission(
    c.get("user").userName + "@" + env["domain"],
    groupId,
  );
  if (!permission) {
    return c.json({ message: "Unauthorized1" }, 401);
  }
  if (!permission.includes(`ADMIN`) && !permission.includes(`MANAGE_GROUP`)) {
    return c.json({ message: "Unauthorized permission" }, 401);
  }
  await Group
    .updateOne({ groupId }, { $set: { name } });
  return c.json({ message: "success" });
}
