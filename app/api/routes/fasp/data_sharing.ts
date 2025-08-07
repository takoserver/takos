import { Hono } from "hono";
import type { Context } from "hono";
import {
  decode as b64decode,
  encode as b64encode,
} from "@std/encoding/base64.ts";
import Fasp from "../../models/takos/fasp.ts";

const app = new Hono();

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

app.post("/fasp/data_sharing/v0/event_subscriptions", async (c) => {
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const { fasp, error } = await verify(c, raw);
  if (error) return error;
  const body = JSON.parse(new TextDecoder().decode(raw));
  if (!body.category || !body.subscriptionType) {
    return c.json({ error: "Invalid body" }, 422);
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
  return c.json({ subscription: { id } }, 201);
});

app.post("/fasp/data_sharing/v0/backfill_requests", async (c) => {
  const raw = new Uint8Array(await c.req.arrayBuffer());
  const { fasp, error } = await verify(c, raw);
  if (error) return error;
  const body = JSON.parse(new TextDecoder().decode(raw));
  if (!body.category || typeof body.maxCount !== "number") {
    return c.json({ error: "Invalid body" }, 422);
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
  return c.json({ backfillRequest: { id } }, 201);
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
  return c.body(null, 204);
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
      return c.json({ error: "Unknown backfill request" }, 404);
    }
    req.status = "pending";
    fasp.communications.push({
      direction: "in",
      endpoint: `/data_sharing/v0/backfill_requests/${id}/continuation`,
      payload: null,
    });
    await fasp.save();
    return c.body(null, 204);
  },
);

export default app;
