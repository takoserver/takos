import { authorizationMiddleware, MyEnv } from "../userInfo.ts";
import { Hono } from "hono";
const app = new Hono<MyEnv>();
app.use("*", authorizationMiddleware);
import { resizeImageTo256x256 } from "./sessions.ts";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "https://jsr.io/@takos/takos-encrypt-ink/5.3.2/utils/buffers.ts";
import User from "../models/users.ts";
import { hashPassword, verifyPassword } from "../utils/password.ts";
app.post(
  "icon",
  zValidator(
    "json",
    z.object({
      icon: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { icon } = c.req.valid("json");
    const resizedIcon = await resizeImageTo256x256(
      new Uint8Array(base64ToArrayBuffer(icon)),
    );
    const buffer = resizedIcon.buffer;
    await User.updateOne({ userName: user.userName }, { icon: arrayBufferToBase64(buffer as ArrayBuffer) });
    return c.json({ message: "success" });
  },
);

app.post(
  "nickname",
  zValidator(
    "json",
    z.object({
      nickName: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { nickName } = c.req.valid("json");
    await User.updateOne({ userName: user.userName }, { nickName });
    return c.json({ message: "success" });
  },
);

app.post(
  "password",
  zValidator(
    "json",
    z.object({
      password: z.string(),
      oldPassword: z.string(),
    }),
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const { password, oldPassword } = c.req.valid("json");
    if (!verifyPassword(oldPassword, user.password, user.salt)) {
      return c.json({ message: "Unauthorized" }, 401);
    }
    const [hash, salt] = await hashPassword(password);
    await User.updateOne({ userName: user.userName }, { password: hash, salt });
    return c.json({ message: "success" });
  },
);

export default app;
