import { Hono } from "hono";
import { z } from "zod";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import {
  parseKeyId,
  signedFetch,
  verifyContentDigest,
  verifyRequest,
} from "../../shared/fasp.ts";
import { b64ToBuf } from "../../shared/buffer.ts";
import { rateLimit } from "../utils/rate_limit.ts";

/**
 * FASP discovery の data_sharing / trends / account_search エンドポイント。
 * docs/fasp/discovery/data_sharing/v0.1/data_sharing.md などを参照。
 */
const app = new Hono();
app.use("/*", rateLimit({ windowMs: 60_000, limit: 30 }));

const subSchema = z.object({
  category: z.enum(["content", "account"]),
  subscriptionType: z.enum(["lifecycle", "trends"]),
  maxBatchSize: z.number().int().positive().optional(),
  threshold: z.object({
    timeframe: z.number().int().positive().optional(),
    shares: z.number().int().positive().optional(),
    likes: z.number().int().positive().optional(),
    replies: z.number().int().positive().optional(),
  }).partial().optional(),
});

// FASP -> takos: イベント購読
app.post("/data_sharing/v0/event_subscriptions", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const serverId = parseKeyId(sigInput);
  if (!serverId) return c.json({ error: "missing key" }, 401);
  const reg = await db.findFaspRegistrationByServerId(serverId);
  if (!reg) return c.json({ error: "unknown server" }, 401);
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(reg.public_key),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const ok = await verifyRequest({
    method: c.req.method,
    url: c.req.url,
    body: raw,
    key,
    signatureInput: sigInput,
    signature,
  });
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  const body = JSON.parse(new TextDecoder().decode(raw));
  const parsed = subSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body" }, 422);
  const doc = await db.createFaspEventSubscription({
    server_id: serverId,
    category: parsed.data.category,
    subscription_type: parsed.data.subscriptionType,
    max_batch_size: parsed.data.maxBatchSize,
    threshold: parsed.data.threshold,
  });
  return c.json({ subscription: { id: doc._id } }, 201);
});

// イベント購読解除
app.delete("/data_sharing/v0/event_subscriptions/:id", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const serverId = parseKeyId(sigInput);
  if (!serverId) return c.json({ error: "missing key" }, 401);
  const reg = await db.findFaspRegistrationByServerId(serverId);
  if (!reg) return c.json({ error: "unknown server" }, 401);
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(reg.public_key),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const ok = await verifyRequest({
    method: c.req.method,
    url: c.req.url,
    body: raw,
    key,
    signatureInput: sigInput,
    signature,
  });
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  await db.deleteFaspEventSubscription(c.req.param("id"));
  return c.body(null, 204);
});

const backfillSchema = z.object({
  category: z.enum(["content", "account"]),
  maxCount: z.number().int().positive(),
});

// バックフィル要求
app.post("/data_sharing/v0/backfill_requests", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const serverId = parseKeyId(sigInput);
  if (!serverId) return c.json({ error: "missing key" }, 401);
  const reg = await db.findFaspRegistrationByServerId(serverId);
  if (!reg) return c.json({ error: "unknown server" }, 401);
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(reg.public_key),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const ok = await verifyRequest({
    method: c.req.method,
    url: c.req.url,
    body: raw,
    key,
    signatureInput: sigInput,
    signature,
  });
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  const body = JSON.parse(new TextDecoder().decode(raw));
  const parsed = backfillSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body" }, 422);
  const doc = await db.createFaspBackfillRequest({
    server_id: serverId,
    category: parsed.data.category,
    max_count: parsed.data.maxCount,
  });
  return c.json({ backfillRequest: { id: doc._id } }, 201);
});

// バックフィル継続要求
app.post("/data_sharing/v0/backfill_requests/:id/continuation", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const serverId = parseKeyId(sigInput);
  if (!serverId) return c.json({ error: "missing key" }, 401);
  const reg = await db.findFaspRegistrationByServerId(serverId);
  if (!reg) return c.json({ error: "unknown server" }, 401);
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(reg.public_key),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const ok = await verifyRequest({
    method: c.req.method,
    url: c.req.url,
    body: raw,
    key,
    signatureInput: sigInput,
    signature,
  });
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  const doc = await db.findFaspBackfillRequestById(c.req.param("id"));
  if (!doc) return c.json({ error: "not_found" }, 404);
  return c.body(null, 204);
});

const announcementSchema = z.object({
  source: z.object({
    subscription: z.object({ id: z.string() }).optional(),
    backfillRequest: z.object({ id: z.string() }).optional(),
  }),
  category: z.enum(["content", "account"]),
  eventType: z.enum(["new", "update", "delete", "trending"]).optional(),
  objectUris: z.array(z.string()),
  moreObjectsAvailable: z.boolean().optional(),
});

// FASP からのアナウンス受信
app.post("/data_sharing/v0/announcements", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const serverId = parseKeyId(sigInput);
  if (!serverId) return c.json({ error: "missing key" }, 401);
  const reg = await db.findFaspRegistrationByServerId(serverId);
  if (!reg) return c.json({ error: "unknown server" }, 401);
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(reg.public_key),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  const ok = await verifyRequest({
    method: c.req.method,
    url: c.req.url,
    body: raw,
    key,
    signatureInput: sigInput,
    signature,
  });
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  const body = JSON.parse(new TextDecoder().decode(raw));
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid body" }, 422);
  return c.body(null, 204);
});

// 以下は takos -> FASP: trends / account_search 呼び出し

// トレンドコンテンツ取得
app.get("/trends/v0/content", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const config = await db.findFaspConfig();
  if (!config || !config.capabilities.trends) {
    return c.json({ error: "not_configured" }, 404);
  }
  const reg = await db.findFaspRegistration();
  if (!reg) return c.json({ error: "not_registered" }, 404);
  const url = new URL("/trends/v0/content", config.base_url);
  const within = c.req.query("withinLastHours");
  const max = c.req.query("maxCount");
  if (within) url.searchParams.set("withinLastHours", within);
  if (max) url.searchParams.set("maxCount", max);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    b64ToBuf(reg.private_key),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const body = new Uint8Array();
  const res = await signedFetch({
    method: "GET",
    url: url.href,
    body,
    key,
    keyId: reg.fasp_id,
    headers: { accept: "application/json" },
  });
  const json = await res.json();
  return c.json(json, res.status);
});

// アカウント検索
app.get("/account_search/v0/search", async (c) => {
  const term = c.req.query("term");
  if (!term) return c.json({ error: "missing term" }, 422);
  const env = getEnv(c);
  const db = createDB(env);
  const config = await db.findFaspConfig();
  if (!config || !config.capabilities.account_search) {
    return c.json({ error: "not_configured" }, 404);
  }
  const reg = await db.findFaspRegistration();
  if (!reg) return c.json({ error: "not_registered" }, 404);
  const url = new URL("/account_search/v0/search", config.base_url);
  url.searchParams.set("term", term);
  const limit = c.req.query("limit");
  if (limit) url.searchParams.set("limit", limit);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    b64ToBuf(reg.private_key),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const body = new Uint8Array();
  const res = await signedFetch({
    method: "GET",
    url: url.href,
    body,
    key,
    keyId: reg.fasp_id,
    headers: { accept: "application/json" },
  });
  const json = await res.json();
  return c.json(json, res.status);
});

export default app;
