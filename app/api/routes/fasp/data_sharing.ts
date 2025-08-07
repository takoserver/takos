import { Hono } from "hono";
import type { Context } from "hono";
import {
  decodeBase64 as b64decode,
  encodeBase64 as b64encode,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createDB } from "../../DB/mod.ts";
import Fasp from "../../models/takos/fasp.ts";
import { getEnv } from "../../shared/config.ts";
import { getDomain } from "../../utils/activitypub.ts";
import { sendAnnouncement } from "../../services/fasp.ts";
import signResponse from "./utils.ts";

const app = new Hono();

// 署名と Content-Digest を検証する
async function verify(c: Context, rawBody: Uint8Array) {
  const digestHeader = c.req.header("content-digest") ?? "";
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", rawBody));
  const digestB64 = b64encode(digest);
  if (digestHeader !== `sha-256=:${digestB64}:`) {
    return { error: c.json({ error: "Invalid Content-Digest" }, 401) };
  }
  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const sigInputMatch = sigInput.match(
    /^sig1=\(([^)]+)\);\s*created=(\d+);\s*keyid="([^"]+)"$/,
  );
  const sigMatch = signature.match(/^sig1=:([A-Za-z0-9+/=]+):$/);
  if (!sigInputMatch || !sigMatch) {
    return { error: c.json({ error: "Invalid Signature" }, 401) };
  }
  const components = sigInputMatch[1].split(" ").map((s) =>
    s.replace(/"/g, "")
  );
  const created = Number(sigInputMatch[2]);
  const keyId = sigInputMatch[3];
  const lines: string[] = [];
  for (const comp of components) {
    if (comp === "@method") {
      lines.push('"@method": ' + c.req.method.toLowerCase());
    } else if (comp === "@target-uri") {
      lines.push('"@target-uri": ' + c.req.url);
    } else if (comp === "content-digest") {
      lines.push('"content-digest": ' + digestHeader);
    }
  }
  const paramStr = components.map((p) => `"${p}"`).join(" ");
  lines.push(
    `"@signature-params": (${paramStr});created=${created};keyid="${keyId}"`,
  );
  const base = new TextEncoder().encode(lines.join("\n"));
  const signatureBytes = b64decode(sigMatch[1]);
  const fasp = await Fasp.findOne({ serverId: keyId });
  if (!fasp) {
    return { error: c.json({ error: "Unknown FASP" }, 404) };
  }
  const publicKeyBytes = b64decode(fasp.faspPublicKey);
  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("Ed25519", key, signatureBytes, base);
  if (!ok) {
    return { error: c.json({ error: "Invalid Signature" }, 401) };
  }
  return { fasp };
}

// 保留中のバックフィル要求を処理してアナウンスを送信する
async function processBackfillRequests(
  env: Record<string, string>,
  domain: string,
) {
  const fasp = await Fasp.findOne({ accepted: true }) as unknown as
    | {
      _id: string;
      backfillRequests: {
        id: string;
        category: string;
        maxCount: number;
        status: string;
      }[];
    }
    | null;
  if (!fasp) return;
  const db = createDB(env);
  for (const req of fasp.backfillRequests) {
    if (req.status !== "pending") continue;
    let objectUris: string[] = [];
    let moreObjectsAvailable = false;
    if (req.category === "content") {
      const notes = await db.getPublicNotes(req.maxCount + 1) as Array<{
        _id: string;
        aud?: { to?: string[]; cc?: string[] };
        extra?: { discoverable?: boolean };
      }>;
      const filtered = notes.filter((n) => {
        const isPublic = [
          ...(n.aud?.to ?? []),
          ...(n.aud?.cc ?? []),
        ].includes("https://www.w3.org/ns/activitystreams#Public");
        const discoverable = Boolean(n.extra?.discoverable);
        return isPublic && discoverable;
      });
      moreObjectsAvailable = filtered.length > req.maxCount;
      objectUris = filtered.slice(0, req.maxCount).map((n) =>
        `https://${domain}/objects/${n._id}`
      );
    } else if (req.category === "account") {
      const accounts = await db.listAccounts() as Array<{
        userName: string;
        extra?: { discoverable?: boolean; visibility?: string };
      }>;
      const filtered = accounts.filter((a) => {
        const vis = a.extra?.visibility ?? "public";
        const discoverable = Boolean(a.extra?.discoverable);
        return vis === "public" && discoverable;
      });
      moreObjectsAvailable = filtered.length > req.maxCount;
      objectUris = filtered.slice(0, req.maxCount).map((a) =>
        `https://${domain}/users/${a.userName}`
      );
    }
    if (objectUris.length > 0) {
      await sendAnnouncement(
        { backfillRequest: { id: req.id } },
        req.category as "content" | "account",
        undefined,
        objectUris,
        moreObjectsAvailable,
      );
    }
    await Fasp.updateOne(
      { _id: fasp._id, "backfillRequests.id": req.id },
      { $set: { "backfillRequests.$.status": "completed" } },
    );
  }
}

app.post("/fasp/data_sharing/v0/event_subscriptions", async (c) => {
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const { fasp, error } = await verify(c, raw);
  if (error) return error;
  const body = JSON.parse(new TextDecoder().decode(raw));
  if (!body.category || !body.subscriptionType) {
    return signResponse(
      { error: "Invalid body" },
      422,
      fasp._id,
      fasp.privateKey,
    );
  }
  const id = crypto.randomUUID();
  fasp.eventSubscriptions.push({
    id,
    category: body.category,
    subscriptionType: body.subscriptionType,
  });
  fasp.communications.push({
    direction: "in",
    endpoint: "/data_sharing/v0/event_subscriptions",
    payload: body,
  });
  await fasp.save();
  return signResponse({ subscription: { id } }, 201, fasp._id, fasp.privateKey);
});

app.post("/fasp/data_sharing/v0/backfill_requests", async (c) => {
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const { fasp, error } = await verify(c, raw);
  if (error) return error;
  const body = JSON.parse(new TextDecoder().decode(raw));
  if (!body.category || typeof body.maxCount !== "number") {
    return signResponse(
      { error: "Invalid body" },
      422,
      fasp._id,
      fasp.privateKey,
    );
  }
  const id = crypto.randomUUID();
  fasp.backfillRequests.push({
    id,
    category: body.category,
    maxCount: body.maxCount,
    status: "pending",
  });
  fasp.communications.push({
    direction: "in",
    endpoint: "/data_sharing/v0/backfill_requests",
    payload: body,
  });
  await fasp.save();
  await processBackfillRequests(getEnv(c), getDomain(c));
  return signResponse(
    { backfillRequest: { id } },
    201,
    fasp._id,
    fasp.privateKey,
  );
});

app.delete("/fasp/data_sharing/v0/event_subscriptions/:id", async (c) => {
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const { fasp, error } = await verify(c, raw);
  if (error) return error;
  const id = c.req.param("id");
  fasp.eventSubscriptions = (fasp.eventSubscriptions as { id: string }[])
    .filter(
      (s) => s.id !== id,
    );
  fasp.communications.push({
    direction: "in",
    endpoint: `/data_sharing/v0/event_subscriptions/${id}`,
    payload: null,
  });
  await fasp.save();
  return signResponse(null, 204, fasp._id, fasp.privateKey);
});

app.post(
  "/fasp/data_sharing/v0/backfill_requests/:id/continuation",
  async (c) => {
    const raw = new Uint8Array(await c.req.arrayBuffer());
    const { fasp, error } = await verify(c, raw);
    if (error) return error;
    const id = c.req.param("id");
    const req = (fasp.backfillRequests as { id: string; status: string }[])
      .find((r) => r.id === id);
    if (!req) {
      return signResponse(
        { error: "Unknown backfill request" },
        404,
        fasp._id,
        fasp.privateKey,
      );
    }
    req.status = "pending";
    fasp.communications.push({
      direction: "in",
      endpoint: `/data_sharing/v0/backfill_requests/${id}/continuation`,
      payload: null,
    });
    await fasp.save();
    await processBackfillRequests(getEnv(c), getDomain(c));
    return signResponse(null, 204, fasp._id, fasp.privateKey);
  },
);

export default app;
