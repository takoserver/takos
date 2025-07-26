import { Hono } from "hono";
import {
  createStorage,
  type ObjectStorage,
} from "../services/object-storage.ts";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";

let storage: ObjectStorage;
export async function initAttachmentModule(env: Record<string, string>) {
  const db = createDB(env);
  storage = await createStorage(env, db);
}

const app = new Hono();
app.use("/attachments/*", authRequired);

app.post("/attachments", async (c) => {
  const { data, mediaType } = await c.req.json();
  if (typeof data !== "string") {
    return c.json({ error: "invalid body" }, 400);
  }
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mediaType && typeof mediaType === "string"
    ? `.${mediaType.split("/")[1] || "bin"}`
    : ".bin";
  const name = `${crypto.randomUUID()}${ext}`;
  const stored = await storage.put(`attachments/${name}`, bytes);
  const url = stored.startsWith("http") ? stored : `/api/attachments/${name}`;
  return c.json({ url });
});

app.get("/attachments/:name", async (c) => {
  const name = c.req.param("name");
  const data = await storage.get(`attachments/${name}`);
  if (!data) return c.text("Not found", 404);
  return new Response(data, {
    headers: { "content-type": "application/octet-stream" },
  });
});

export default app;
