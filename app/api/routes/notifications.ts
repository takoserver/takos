import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createNotification,
  deleteNotification,
  listNotifications,
  markNotificationRead,
} from "../db.ts";
import authRequired from "../utils/auth.ts";
import { getEnv } from "../../shared/config.ts";

const app = new Hono();
app.use("/notifications/*", authRequired);

app.get("/notifications", async (c) => {
  const env = getEnv(c);
  const list = await listNotifications(env);
  const formatted = list.map((doc) => ({
    id: doc._id!,
    title: doc.title,
    message: doc.message,
    type: doc.type,
    read: doc.read,
    createdAt: doc.createdAt,
  }));
  return c.json(formatted);
});

app.post(
  "/notifications",
  zValidator(
    "json",
    z.object({ title: z.string(), message: z.string(), type: z.string() }),
  ),
  async (c) => {
    const env = getEnv(c);
    const { title, message, type } = c.req.valid("json") as {
      title: string;
      message: string;
      type: string;
    };
    const notification = await createNotification(
      env,
      title,
      message,
      type,
    );
    return c.json({
      id: notification._id!,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      createdAt: notification.createdAt,
    });
  },
);

app.put("/notifications/:id/read", async (c) => {
  const env = getEnv(c);
  const id = c.req.param("id");
  const ok = await markNotificationRead(env, id);
  if (!ok) return c.json({ error: "Notification not found" }, 404);
  return c.json({ success: true });
});

app.delete("/notifications/:id", async (c) => {
  const env = getEnv(c);
  const id = c.req.param("id");
  const ok = await deleteNotification(env, id);
  if (!ok) return c.json({ error: "Notification not found" }, 404);
  return c.json({ success: true });
});

export default app;
