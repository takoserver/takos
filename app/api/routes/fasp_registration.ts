import { Hono } from "hono";
import { z } from "zod";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import {
  parseKeyId,
  verifyContentDigest,
  verifyRequest,
} from "../../shared/fasp.ts";
import { b64ToBuf, bufToB64 } from "../../shared/buffer.ts";

/**
 * FASP General の登録・provider_info・capability 管理エンドポイント。
 * docs/fasp/general/v0.1/registration.md と provider_info.md を参照。
 * docs/FASP.md 4.1-4.2 も参照。ベースパスは /fasp。
 */
const app = new Hono();

const registrationSchema = z.object({
  name: z.string(),
  baseUrl: z.string(),
  serverId: z.string(),
  publicKey: z.string(),
});

// 管理者用：登録済みFASP一覧
app.get("/registrations", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const regs = await db.listFaspRegistrations();
  return c.json({ registrations: regs });
});

// 管理者用：登録承認
app.post("/registrations/:id/approve", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const id = c.req.param("id");
  await db.approveFaspRegistration(id);
  return c.body(null, 204);
});

// FASP -> takos: 登録情報送信
app.post("/registration", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const digest = c.req.header("content-digest") ?? "";
  if (!await verifyContentDigest(raw, digest)) {
    return c.json({ error: "invalid digest" }, 401);
  }
  const body = JSON.parse(new TextDecoder().decode(raw));
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body" }, 400);
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBuf(parsed.data.publicKey),
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

  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519", namedCurve: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  const priv = bufToB64(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  );
  const pub = bufToB64(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const faspId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db.createFaspRegistration({
    fasp_id: faspId,
    name: parsed.data.name,
    base_url: parsed.data.baseUrl,
    server_id: parsed.data.serverId,
    public_key: parsed.data.publicKey,
    private_key: priv,
    our_public_key: pub,
    approved: false,
    capabilities: [],
  });
  const completion = `https://${
    env["ROOT_DOMAIN"] ?? env["ACTIVITYPUB_DOMAIN"]
  }/admin/fasps`;
  return c.json({
    faspId,
    publicKey: pub,
    registrationCompletionUri: completion,
  }, 201);
});

// takos -> FASP: provider info 取得 (DB から返す)
app.get("/provider_info", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const config = await db.findFaspConfig();
  if (!config) return c.json({ error: "not_configured" }, 404);
  const caps = Object.entries(config.capabilities)
    .filter(([_, v]) => v)
    .map(([id, version]) => ({ id, version }));
  return c.json({ name: env["FASP_NAME"] ?? "takos FASP", capabilities: caps });
});

// takos <- server: capability 有効化
app.post("/capabilities/:id/:ver/activation", async (c) => {
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
  await db.updateFaspCapability(serverId, {
    id: c.req.param("id"),
    version: c.req.param("ver"),
  }, true);
  return c.body(null, 204);
});

// capability 無効化
app.delete("/capabilities/:id/:ver/activation", async (c) => {
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
  await db.updateFaspCapability(serverId, {
    id: c.req.param("id"),
    version: c.req.param("ver"),
  }, false);
  return c.body(null, 204);
});

export default app;
