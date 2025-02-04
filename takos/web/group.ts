import { Group, Member, Channels, ChannelPermissions, Category, CategoryPermissions } from "../models/groups.ts";
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
      const resizedIcon = await resizeImageTo256x256(new Uint8Array(base64ToArrayBuffer(icon)));
      await Group.create({
        groupId,
        groupName: name,
        groupIcon: arrayBufferToBase64(resizedIcon),
        type: "private",
        owner: user.userName + "@" + env["domain"],
        isOwner: true,
      });
    } catch (error) {
      console.error("Error resizing image:", error);
      return c.json({ message: "Error resizing image" }, 500);
    }
    await Channels.create({
        id: uuidv7(),
        name: "general",
        groupId: groupId,
    })
    await Member.create({
      groupId,
      userId: user.userName + "@" + env["domain"],
      role: []
    });
    return c.json({ groupId });
  },
);