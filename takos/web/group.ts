import {
  Category,
  CategoryPermissions,
  ChannelPermissions,
  Channels,
  Group,
  Member,
  Roles,
} from "../models/groups.ts";
import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Hono } from "hono";
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
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { name, icon, groupid } = c.req.valid("json");
    const domain = env["domain"];
    const id = groupid || uuidv7();
    const groupId = id + "@" + domain;
    try {
      const resizedIcon = await resizeImageTo256x256(
        new Uint8Array(base64ToArrayBuffer(icon)),
      );
      await Group.create({
        groupId,
        groupName: name,
        groupIcon: arrayBufferToBase64(resizedIcon),
        type: "private",
        owner: user.userName + "@" + env["domain"],
        isOwner: true,
        defaultChannelId: "general",
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
    const permissions = await getUserPermission(
      user.userName + "@" + env["domain"],
      groupId,
    );
    if (!permissions || !permissions.includes("INVITE_USER")) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    if (group.isOwner) {
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
        return c.json({ message: "Error inviting user" }, 500);
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
        return c.json({ message: "Error inviting user" }, 500);
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
        role: [],
        beforeEventId: group.beforeEventId,
      },
    }),
    uniqueDomains,
  );
  //@ts-ignore
  console.log(await res[0].json());
  await Group.updateOne({ groupId }, { $set: { beforeEventId: eventId } });
  return c.json({ message: "success" });
}

/**
 * リモートグループのデータを新規作成する
 */
async function createRemoteGroup(
  groupId: string,
  resJson: any,
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
        await createRemoteGroup(groupId, await groupData.json());
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
      await handleRemoveChannel({
        groupId,
        channelId,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      return c.json({ message: "Unauthorized" }, 401);
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
    if (categoryId) {
      if (!await Category.findOne({ id: categoryId, groupId })) {
        return c.json({ message: "Invalid categoryId" }, 400);
      }
    }
    if (group.isOwner) {
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
      await fff(
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
    const category = await Category.findOne({ id: categoryId, groupId });
    if (!category) {
      return c.json({ message: "Invalid categoryId" }, 400);
    }
    if (group.isOwner) {
      await handleRemoveCategory({
        groupId,
        categoryId,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    } else {
      return c.json({ message: "Unauthorized" }, 401);
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
      await handleAddCategory({
        groupId,
        name,
        id,
        permissions: c.req.valid("json").permissions,
        beforeEventId: group.beforeEventId!,
      });
      return c.json({ message: "success" });
    }
    return c.json({ message: "Unauthorized" }, 401);
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
    const permission = await getUserPermission(
      user.userName + "@" + env["domain"],
      c.req.valid("json").groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (!permission.includes(`ADMIN`)) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
    for (const perm of permissions) {
      if (permission.includes(perm)) {
        return c.json({ message: "Unauthorized permission" }, 401);
      }
    }
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
      const role = await Roles.findOne({ id, groupId });
      if (role) {
        await Roles.updateOne({ id }, { name, color, permissions });
      } else {
        await Roles.create({ id, name, color, permissions, groupId });
      }
      await Roles.updateOne({ id }, { name, color, permissions });
      return c.json({ message: "success" });
    }
    return c.json({ message: "Unauthorized" }, 401);
  },
);

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
    const permission = await getUserPermission(
      user.userName + "@" + env["domain"],
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (!permission.includes(`ADMIN`)) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
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
    const role = await Roles.findOne({ id: roleId, groupId });
    if (!role) {
      return c.json({ message: "Invalid roleId" }, 400);
    }
    if (group.isOwner) {
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
            beforeEventId: group.beforeEventId,
          },
        }),
        uniqueDomains,
      );
      return c.json({ message: "success" });
    } else {
      return c.json({ message: "Unauthorized" }, 401);
    }
  },
);

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
    const permission = await getUserPermission(
      user.userName + "@" + env["domain"],
      groupId,
    );
    if (!permission) {
      return c.json({ message: "Unauthorized1" }, 401);
    }
    if (!permission.includes(`ADMIN`)) {
      return c.json({ message: "Unauthorized permission" }, 401);
    }
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
      await Member.updateOne({ groupId, userId: c.req.valid("json").userId }, {
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
          event: "t.group.sync.user.add",
          eventId: eventId,
          payload: {
            groupId,
            userId: c.req.valid("json").userId,
            role: roleId,
            beforeEventId: group.beforeEventId,
          },
        }),
        uniqueDomains,
      );
      return c.json({ message: "success" });
    } else {
      return c.json({ message: "Unauthorized" }, 401);
    }
  },
);

app.post(
  "join/rquest",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
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
  async (c) => {},
);

app.post(
  "join/remove",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {},
);

app.post(
  "join/cancel",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
);

app.post(
  "user/kick",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
  },
);

app.post(
  "user/ban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {
  },
);

app.post(
  "user/unban",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {},
);

app.post(
  "channel/default",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      channelId: z.string(),
    }),
  ),
  async (c) => {},
);

app.post(
  "user/owner",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
      userId: z.string(),
    }),
  ),
  async (c) => {},
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
  async (c) => {},
);
