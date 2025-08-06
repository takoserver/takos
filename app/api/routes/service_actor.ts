import { Hono } from "hono";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import { getServiceActorKey } from "../services/service_actor.ts";
import { activityHandlers } from "../activity_handlers.ts";
import { getDomain, jsonResponse } from "../utils/activitypub.ts";
import { parseActivityRequest } from "../utils/inbox.ts";
import { signedFetch } from "../../shared/fasp.ts";
import { b64ToBuf } from "../../shared/buffer.ts";

/**
 * 対象URIが FEP-5feb の discoverable 条件を満たすか判定。
 * docs/FASP.md 8章・docs/fasp/discovery/data_sharing/v0.1/data_sharing.md 参照。
 */
async function isDiscoverable(uri: string): Promise<boolean> {
  try {
    const headers = {
      accept:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
    };
    const res = await fetch(uri, { headers });
    if (!res.ok) return false;
    const obj = await res.json();
    const publicUri = "https://www.w3.org/ns/activitystreams#Public";
    if (obj.type === "Actor") return obj.discoverable === true;
    const to = Array.isArray(obj.to) ? obj.to : obj.to ? [obj.to] : [];
    const cc = Array.isArray(obj.cc) ? obj.cc : obj.cc ? [obj.cc] : [];
    if (![...to, ...cc].includes(publicUri)) return false;
    const actorUri = typeof obj.attributedTo === "string"
      ? obj.attributedTo
      : obj.attributedTo?.id;
    if (!actorUri) return false;
    const aRes = await fetch(actorUri, { headers });
    if (!aRes.ok) return false;
    const actor = await aRes.json();
    return actor.discoverable === true;
  } catch {
    return false;
  }
}

/**
 * Service Actor 公開および inbox/outbox 実装。
 * docs/FASP.md 6章・2章に沿って実装。
 */
const app = new Hono();

// Actor 表示
app.get("/actor", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const domain = getDomain(c);
  const { publicKey } = await getServiceActorKey(db, domain);
  const actor = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: `https://${domain}/actor`,
    type: "Service",
    preferredUsername: "takos",
    inbox: `https://${domain}/inbox`,
    outbox: `https://${domain}/outbox`,
    publicKey: {
      id: `https://${domain}/actor#main-key`,
      owner: `https://${domain}/actor`,
      publicKeyPem: publicKey,
    },
  };
  return jsonResponse(c, actor, 200, "application/activity+json");
});

// outbox は空のコレクションを返す
app.get("/outbox", (c) => {
  const domain = getDomain(c);
  const outbox = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/outbox`,
    type: "OrderedCollection",
    totalItems: 0,
    orderedItems: [],
  };
  return jsonResponse(c, outbox, 200, "application/activity+json");
});

// inbox 処理
app.post("/inbox", async (c) => {
  const result = await parseActivityRequest(c);
  if (!result) return jsonResponse(c, { error: "Invalid signature" }, 401);
  const { activity } = result;
  const handler = activityHandlers[activity.type];
  if (handler) await handler(activity, "service", c);
  return jsonResponse(c, { status: "ok" }, 200, "application/activity+json");
});

// FASP へ announcement を配送
app.post("/fasp/announcements", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const config = await db.findFaspConfig();
  if (!config) return c.json({ error: "not_configured" }, 400);
  const reg = await db.findFaspRegistration();
  if (!reg) return c.json({ error: "not_registered" }, 400);
  const url = `${config.base_url}/data_sharing/v0/announcements`;
  const bodyObj = await c.req.json();
  const uris: string[] = Array.isArray(bodyObj.objectUris)
    ? bodyObj.objectUris
    : [];
  const objectUris: string[] = [];
  for (const uri of uris) {
    if (await isDiscoverable(uri)) {
      objectUris.push(uri);
    } else {
      console.warn(`discoverableでないため除外: ${uri}`);
    }
  }
  if (objectUris.length === 0) {
    return c.json({ error: "no_discoverable_object" }, 400);
  }
  bodyObj.objectUris = objectUris;
  const raw = new TextEncoder().encode(JSON.stringify(bodyObj));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    b64ToBuf(reg.private_key),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const res = await signedFetch({
    method: "POST",
    url,
    body: raw,
    key,
    keyId: reg.server_id,
    headers: { "content-type": "application/json" },
  });
  return c.json({ status: res.status });
});

export default app;
