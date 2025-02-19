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
    const id = groupid || uuidv7()
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
  "accept",
  zValidator(
    "json",
    z.object({
      groupId: z.string(),
    }),
  ),
  async (c) => { //group
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { groupId } = c.req.valid("json");
    const group = await Group.findOne({ groupId });
    if (group) {
      if (group!.isOwner) {
        if (
          await Member.findOne({
            groupId,
            userId: user.userName + "@" + env["domain"],
          })
        ) {
          return c.json({ message: "Unauthorized" }, 401);
        }
        if (group.type !== "private") {
          return c.json({ message: "Invalid group type" }, 400);
        }
        if (group.invites.includes(user.userName + "@" + env["domain"])) {
          await Group.updateOne({ groupId }, {
            $pull: { invites: user.userName + "@" + env["domain"] },
          });
          await Member.create({
            groupId,
            userId: user.userName + "@" + env["domain"],
            role: [],
          });
          await request.deleteOne({
            sender: group.owner,
            receiver: user.userName + "@" + env["domain"],
            type: "groupInvite",
          });
          return c.json({ message: "success" });
        }
        return c.json({ message: "Invalid request" }, 400);
      }
    }
    if (groupId.split("@")[1] === env["domain"]) {
      const groupDomain = groupId.split("@")[1];
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
              userId: user.userName + "@" + env["domain"],
            },
          }),
          [groupDomain],
        );
        if (Array.isArray(res) ? res[0].status !== 200 : true) {
          return c.json({ message: "Error accepting group" }, 500);
        }
        await Member.create({
          groupId: groupId,
          userId: user.userName + "@" + env["domain"],
        });
        if(!group) {
          await Group.create({
            groupId,
            groupName: groupId.split("@")[0],
            groupIcon: "",
            type: "private",
            owner: groupId,
            isOwner: false,
            defaultChannelId: "general",
          });
        }
        return c.json({ message: "success" });
      } catch (error) {
        console.error("Error accepting group:", error);
        return c.json({ message: "Error accepting group" }, 500);
      }
    }
    return c.json({ message: "Invalid group" }, 400);
  },
);
