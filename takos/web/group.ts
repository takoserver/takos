import {
  Category,
  CategoryPermissions,
  ChannelPermissions,
  Channels,
  Group,
  Member,
  Roles,
} from "../models/groups.ts";
import app from "../userInfo.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { load } from "@std/dotenv";
import { uuidv7 } from "npm:uuidv7@^1.0.2";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "https://jsr.io/@takos/takos-encrypt-ink/5.3.2/utils/buffers.ts";
import { resizeImageTo256x256 } from "./sessions.ts";

const env = await load();

export default app;

app.post(
  "create",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      icon: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { name, icon } = c.req.valid("json");
    const groupId = uuidv7() + "@" + env["domain"];
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
      id: uuidv7(),
      name: "general",
      groupId: groupId,
      order: 0,
    });
    await Member.create({
      groupId,
      userId: user.userName + "@" + env["domain"],
      role: [],
    });
    return c.json({ groupId });
  },
);

app.get(
  "info",
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const group = await Group.findOne({
      groupId: c.req.query("groupId"),
      type: "private",
    });
    if (!group) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const member = await Member.findOne({
      groupId: group.groupId,
      userId: user.userName + "@" + env["domain"],
    });
    if (!member) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const members = (await Member.find({
      groupId: group.groupId,
    })).map((member) => {
      return { userId: member.userId, role: member.role };
    });
    const channels = (await Channels.find({
      groupId: group.groupId,
    })).map((channel) => {
      return {
        name: channel.name,
        groupId: channel.groupId,
        id: channel.id,
        category: channel.category,
      };
    });
    const roles = (await Roles.find({
        groupId: group.groupId,
      })).map((role) => {
        return {
            id: role.id,
            name: role.name,
            groupId: role.groupId,
            color: role.color,
            permissions: role.permissions,
        }
      })
    const categories = (await Category.find({
        groupId: group.groupId,
      })).map((category) => {
        return {
            id: category.id,
            name: category.name,
            groupId: category.groupId,
        };
    });
    const categoriesPermissions = (await CategoryPermissions.find({
        groupId: group.groupId,
      })).map((categoryPermissions) => {
        return {
            groupId: categoryPermissions.groupId,
            permissions: categoryPermissions.permissions,
            categoryId: categoryPermissions.categoryId,
            roleId: categoryPermissions.roleId,
        }}
    )
    const channelsPermissions = (await ChannelPermissions.find({
        groupId: group.groupId,
      })).map((channelPermissions) => {
        return {
            groupId: channelPermissions.groupId,
            permissions: channelPermissions.permissions,
            roleId: channelPermissions.roleId,
            channelId: channelPermissions.channelId,
            inheritCategoryPermissions: channelPermissions.inheritCategoryPermissions,
        }}
    )
    return c.json({
      members,
      channels,
      roles,
      categories,
      categoriesPermissions,
      channelsPermissions,
    });
  },
);