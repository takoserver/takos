import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import { deliverDirectMessage, getDomain } from "../utils/activitypub.ts";
import { sendToUser } from "./ws.ts";
import authRequired from "../utils/auth.ts";
import { rateLimit } from "../utils/rate_limit.ts";

const app = new Hono();
app.use("/dm", authRequired);

app.get(
  "/dm",
  zValidator(
    "query",
    z.object({
      author: z.string(),
      peer: z.string(),
      before: z.string().optional(),
    }),
  ),
  async (c) => {
    const { author, peer, before } = c.req.valid("query") as {
      author: string;
      peer: string;
      before?: string;
    };
    const env = getEnv(c);
    const db = createDB(env);
    const filter = before ? { published: { $lt: new Date(before) } } : {};
    const messages = await db.findMessages(
      { from: author, to: peer },
      filter,
      { published: 1 },
    );
    return c.json({ messages });
  },
);

app.post(
  "/dm",
  rateLimit({ windowMs: 60_000, limit: 30 }),
  zValidator(
    "json",
    z.object({
      author: z.string(),
      to: z.string(),
      content: z.string(),
    }),
  ),
  async (c) => {
    const { author, to, content } = c.req.valid("json") as {
      author: string;
      to: string;
      content: string;
    };
    const domain = getDomain(c);
    const env = getEnv(c);
    const db = createDB(env);
    const saved = await db.saveMessage(
      domain,
      author,
      content,
      {},
      { to: [to], cc: [] },
      { from: author, to },
    );
    const payload = { type: "newMessage", payload: saved };
    sendToUser(`${author}@${domain}`, payload);
    try {
      const url = new URL(to);
      if (url.hostname === domain) {
        const toUser = url.pathname.split("/").pop();
        if (toUser) sendToUser(`${toUser}@${domain}`, payload);
      }
    } catch {
      // 無効な URL の場合は通知を送らない
    }
    await deliverDirectMessage(to, content, author, domain, env).catch(
      (err) => {
        console.error("Delivery failed:", err);
      },
    );
    return c.json({ ok: true });
  },
);

export default app;
