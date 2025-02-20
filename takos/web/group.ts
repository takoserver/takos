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
    if (group.isOwner) {
      await Group.updateOne({ groupId }, {
        $push: { invites: userId },
      });
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
    } else {
      // t.group.invite
    }
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
    const group = await Group.findOne({ groupId, owner: user.userName + "@" + env["domain"] });
    if (!group) {
      return c.json({ message: "Invalid groupId" }, 400);
    }
    if (!group.isOwner) {
      // t.group.leave
    }
    await Member.deleteOne({ groupId, userId: user.userName + "@" + env["domain"] });

    //t.group.sync.user.remove
    return c.json({ message: "success" });
  }
)

async function handleLocalGroupAccept(c: any, group: any, groupId: string, currentUser: string) {
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
  await request.deleteOne({ sender: group.owner, receiver: currentUser, type: "groupInvite" });
  return c.json({ message: "success" });
}

/**
 * リモートグループのデータを新規作成する
 */
async function createRemoteGroup(groupId: string, resJson: any) {
  await Group.create({
    groupId,
    type: resJson.type,
    owner: resJson.owner,
    isOwner: false,
    defaultChannelId: resJson.defaultChannel,
    channelOrder: resJson.order,
    order: resJson.order,
  });
  for (const channel of resJson.channels.channels) {
    await Channels.create({
      id: channel.id,
      name: channel.name,
      groupId,
      order: channel.order,
      category: channel.category,
    });
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

export async function handleReCreateGroup(groupId: string) {
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
  await createRemoteGroup(groupId, await fetch(`https://${groupDomain}/_takos/v1/group/all/${groupId}`).then((res) => res.json()));
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
    let groupData: Response | undefined;
    if (!group) {
      groupData = await fetch(`https://${groupDomain}/_takos/v1/group/all/${groupId}`);
      if (groupData.status !== 200) {
        return c.json({ message: "Error accepting group3" }, 500);
      }
    }
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
      await Member.create({ groupId, userId: currentUser });
      if (!group && groupData) {
        const resJson = await groupData.json();
        await createRemoteGroup(groupId, resJson);
      }
      return c.json({ message: "success" });
    } catch (error) {
      console.error("Error accepting group:", error);
      return c.json({ message: "Error accepting group1" }, 500);
    }
  },
);
