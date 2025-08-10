import { Hono } from "hono";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import { getEnv } from "../../shared/config.ts";
import { rateLimit } from "../utils/rate_limit.ts";
import {
  type ActivityPubActor,
  buildActivityFromStored,
  createAddActivity,
  createCreateActivity,
  createDeleteActivity,
  createRemoveActivity,
  deliverActivityPubObject,
  fetchJson,
  getDomain,
  resolveActor,
} from "../utils/activitypub.ts";
import { deliverToFollowers } from "../utils/deliver.ts";
import { sendToUser } from "./ws.ts";
import { decodeMLSMessage } from "../../shared/mls_message.ts";

interface ActivityPubActivity {
  [key: string]: unknown;
  "@context"?: unknown;
  to?: unknown;
  cc?: unknown;
}

interface RemoteActorCache {
  actorUrl: string;
}

interface KeyPackageDoc {
  _id?: unknown;
  content: string;
  mediaType: string;
  encoding: string;
  groupInfo?: string;
  expiresAt?: unknown;
  used?: boolean;
  createdAt: unknown;
}

interface EncryptedKeyPairDoc {
  content: string;
}

interface EncryptedMessageDoc {
  _id?: unknown;
  from: string;
  to: string[];
  content: string;
  mediaType: string;
  encoding: string;
  createdAt: unknown;
}

async function resolveActorCached(
  acct: string,
  env: Record<string, string>,
) {
  const [name, host] = acct.split("@");
  if (!name || !host) return null;

  const db = createDB(env);
  const cached = await db.findRemoteActorByUrl(
    acct.startsWith("http") ? acct : "",
  ) as RemoteActorCache | null;

  let actor:
    | (ActivityPubActor & { keyPackages?: string | { id?: string } })
    | null = null;
  if (cached) {
    try {
      actor = await fetchJson<
        ActivityPubActor & { keyPackages?: string | { id?: string } }
      >(
        cached.actorUrl,
        {},
        undefined,
        env,
      );
    } catch (err) {
      console.error(`Failed to fetch cached actor ${cached.actorUrl}:`, err);
    }
  }

  if (!actor) {
    actor = await resolveActor(name, host) as
      | (ActivityPubActor & { keyPackages?: string | { id?: string } })
      | null;
    if (actor) {
      await db.upsertRemoteActor({
        actorUrl: actor.id,
        name: actor.name || "",
        preferredUsername: actor.preferredUsername || "",
        icon: actor.icon || null,
        summary: actor.summary || "",
      });
    }
  }

  return actor;
}

const app = new Hono();

app.get("/users/:user/keyPackages", async (c) => {
  const identifier = c.req.param("user");
  const domain = getDomain(c);

  const [user, host] = identifier.split("@");
  if (!host || host === domain) {
    const username = user ?? identifier;
    const db = createDB(getEnv(c));
    const list = await db.listKeyPackages(username) as KeyPackageDoc[];
    const items = list.map((doc) => ({
      id: `https://${domain}/users/${username}/keyPackages/${doc._id}`,
      type: "KeyPackage",
      content: doc.content,
      mediaType: doc.mediaType,
      encoding: doc.encoding,
      groupInfo: doc.groupInfo,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    }));
    return c.json({ type: "Collection", items });
  }

  const acct = identifier;

  const actor = await resolveActorCached(
    acct,
    getEnv(c),
  );
  if (!actor) return c.json({ type: "Collection", items: [] });
  const kpUrl = typeof actor.keyPackages === "string"
    ? actor.keyPackages
    : actor.keyPackages?.id;
  if (!kpUrl) return c.json({ type: "Collection", items: [] });

  try {
    const col = await fetchJson<{ items?: unknown[] }>(
      kpUrl,
      {},
      undefined,
      getEnv(c),
    );
    const items = Array.isArray(col.items) ? col.items : [];
    return c.json({ type: "Collection", items });
  } catch (_err) {
    console.error("remote keyPackages fetch failed", _err);
    return c.json({ type: "Collection", items: [] });
  }
});

app.get("/users/:user/keyPackages/:keyId", async (c) => {
  const user = c.req.param("user");
  const keyId = c.req.param("keyId");
  const domain = getDomain(c);
  const db = createDB(getEnv(c));
  const doc = await db.findKeyPackage(user, keyId) as KeyPackageDoc | null;
  if (!doc) return c.body("Not Found", 404);
  await db.markKeyPackageUsed(user, keyId);
  await db.cleanupKeyPackages(user);
  const object = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ],
    id: `https://${domain}/users/${user}/keyPackages/${keyId}`,
    type: "KeyPackage",
    attributedTo: `https://${domain}/users/${user}`,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    mediaType: doc.mediaType,
    encoding: doc.encoding,
    content: doc.content,
    groupInfo: doc.groupInfo,
    expiresAt: doc.expiresAt,
  };
  return c.json(object);
});

app.post("/users/:user/keyPackages", authRequired, async (c) => {
  const user = c.req.param("user");
  const { content, mediaType, encoding, groupInfo, expiresAt } = await c.req
    .json();
  if (typeof content !== "string") {
    return c.json({ error: "content is required" }, 400);
  }
  const db = createDB(getEnv(c));
  const pkg = await db.createKeyPackage(
    user,
    content,
    mediaType,
    encoding,
    groupInfo,
    expiresAt ? new Date(expiresAt) : undefined,
  ) as KeyPackageDoc;
  await db.cleanupKeyPackages(user);
  const domain = getDomain(c);
  const actorId = `https://${domain}/users/${user}`;
  const keyObj = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ],
    id: `https://${domain}/users/${user}/keyPackages/${pkg._id}`,
    type: "KeyPackage",
    attributedTo: actorId,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    mediaType: pkg.mediaType,
    encoding: pkg.encoding,
    content: pkg.content,
    groupInfo: pkg.groupInfo,
    expiresAt: pkg.expiresAt,
  };
  const addActivity = createAddActivity(domain, actorId, keyObj);
  await deliverToFollowers(getEnv(c), user, addActivity, domain);
  return c.json({ result: "ok", keyId: String(pkg._id) });
});

app.delete("/users/:user/keyPackages/:keyId", authRequired, async (c) => {
  const user = c.req.param("user");
  const keyId = c.req.param("keyId");
  const domain = getDomain(c);
  const db = createDB(getEnv(c));
  await db.deleteKeyPackage(user, keyId);
  await db.cleanupKeyPackages(user);
  const actorId = `https://${domain}/users/${user}`;
  const removeActivity = createRemoveActivity(
    domain,
    actorId,
    `https://${domain}/users/${user}/keyPackages/${keyId}`,
  );
  const deleteActivity = createDeleteActivity(
    domain,
    actorId,
    `https://${domain}/users/${user}/keyPackages/${keyId}`,
  );
  await deliverToFollowers(getEnv(c), user, removeActivity, domain);
  await deliverToFollowers(getEnv(c), user, deleteActivity, domain);
  return c.json({ result: "removed" });
});

app.get("/users/:user/encryptedKeyPair", async (c) => {
  const user = c.req.param("user");
  const db = createDB(getEnv(c));
  const doc = await db.findEncryptedKeyPair(user) as EncryptedKeyPairDoc | null;
  if (!doc) return c.json({ content: null });
  return c.json({ content: doc.content });
});

app.post("/users/:user/encryptedKeyPair", authRequired, async (c) => {
  const user = c.req.param("user");
  const { content } = await c.req.json();
  if (typeof content !== "string") {
    return c.json({ error: "invalid body" }, 400);
  }
  const db = createDB(getEnv(c));
  await db.upsertEncryptedKeyPair(user, content);
  return c.json({ result: "ok" });
});

app.delete("/users/:user/encryptedKeyPair", authRequired, async (c) => {
  const user = c.req.param("user");
  const db = createDB(getEnv(c));
  await db.deleteEncryptedKeyPair(user);
  return c.json({ result: "removed" });
});

app.post("/users/:user/resetKeys", authRequired, async (c) => {
  const user = c.req.param("user");
  const domain = getDomain(c);
  const actorId = `https://${domain}/users/${user}`;
  const db = createDB(getEnv(c));
  const keyPkgs = await db.listKeyPackages(user) as KeyPackageDoc[];
  for (const pkg of keyPkgs) {
    const removeActivity = createRemoveActivity(
      domain,
      actorId,
      `https://${domain}/users/${user}/keyPackages/${pkg._id}`,
    );
    const deleteActivity = createDeleteActivity(
      domain,
      actorId,
      `https://${domain}/users/${user}/keyPackages/${pkg._id}`,
    );
    await deliverToFollowers(getEnv(c), user, removeActivity, domain);
    await deliverToFollowers(getEnv(c), user, deleteActivity, domain);
  }
  await db.deleteKeyPackagesByUser(user);
  await db.deleteEncryptedKeyPair(user);
  return c.json({ result: "reset" });
});

app.post(
  "/users/:user/messages",
  authRequired,
  rateLimit({ windowMs: 60_000, limit: 20 }),
  async (c) => {
    const acct = c.req.param("user");
    const [sender, senderDomain] = acct.split("@");
    if (!sender || !senderDomain) {
      return c.json({ error: "invalid user format" }, 400);
    }
    const body = await c.req.json();
    const { to, cc, content, mediaType, encoding, attachments } = body;
    if (!Array.isArray(to) || typeof content !== "string") {
      return c.json({ error: "invalid body" }, 400);
    }
    const ccList = Array.isArray(cc) ? cc : [];
    let allMembers = Array.from(new Set([...to, ...ccList]));
    let [primary, ...ccMembers] = allMembers;
    const context = Array.isArray(body["@context"])
      ? body["@context"] as string[]
      : [
        "https://www.w3.org/ns/activitystreams",
        "https://purl.archive.org/socialweb/mls",
      ];
    const typeArr = Array.isArray(body.type)
      ? body.type as string[]
      : typeof body.type === "string"
      ? [body.type]
      : [];
    const domain = getDomain(c);
    const env = getEnv(c);
    const db = createDB(env);

    const decoded = decodeMLSMessage(content);
    let msgType = typeArr.includes("PublicMessage")
      ? "PublicMessage"
      : "PrivateMessage";
    if (!typeArr.length && decoded && decoded.type === "PublicMessage") {
      msgType = "PublicMessage";
    }
    let bodyObj: Record<string, unknown> | null = null;
    if (msgType === "PublicMessage" && decoded) {
      try {
        bodyObj = JSON.parse(decoded.body) as Record<string, unknown>;
      } catch {
        bodyObj = null;
      }
    }
    if (
      bodyObj &&
      bodyObj.type === "welcome" &&
      typeof bodyObj.member === "string"
    ) {
      allMembers = [bodyObj.member];
      [primary, ...ccMembers] = allMembers;
    }
    const isPublic = msgType === "PublicMessage";

    const mType = typeof mediaType === "string" ? mediaType : "message/mls";
    const encType = typeof encoding === "string" ? encoding : "base64";
    const msg = isPublic
      ? await db.createPublicMessage({
        from: acct,
        to: allMembers,
        content,
        mediaType: mType,
        encoding: encType,
      }) as EncryptedMessageDoc
      : await db.createEncryptedMessage({
        from: acct,
        to: allMembers,
        content,
        mediaType: mType,
        encoding: encType,
      }) as EncryptedMessageDoc;

    const extra: Record<string, unknown> = {
      mediaType: msg.mediaType,
      encoding: msg.encoding,
    };
    if (Array.isArray(attachments)) {
      extra.attachments = attachments;
    }

    const actorId = `https://${domain}/users/${sender}`;
    const object = await db.saveMessage(
      domain,
      sender,
      content,
      extra,
      { to: primary ? [primary] : [], cc: ccMembers },
    );

    const saved = object as Record<string, unknown>;

    const activityObj = buildActivityFromStored(
      {
        ...saved,
        type: msgType,
      } as {
        _id: unknown;
        type: string;
        content: string;
        published: unknown;
        extra: Record<string, unknown>;
      },
      domain,
      sender,
      false,
    );
    (activityObj as ActivityPubActivity)["@context"] = context;

    const activity = createCreateActivity(domain, actorId, activityObj);
    (activity as ActivityPubActivity)["@context"] = context;
    // 個別配信
    (activity as ActivityPubActivity).to = primary ? [primary] : [];
    (activity as ActivityPubActivity).cc = ccMembers;
    const recipients = allMembers;
    deliverActivityPubObject(recipients, activity, sender, domain, getEnv(c))
      .catch(
        (err) => {
          console.error("deliver failed", err);
        },
      );

    const newMsg = {
      id: String(msg._id),
      from: acct,
      to: allMembers,
      content,
      mediaType: msg.mediaType,
      encoding: msg.encoding,
      createdAt: msg.createdAt,
      attachments: Array.isArray(attachments)
        ? attachments.map((att, idx) => {
          const a = att as Record<string, unknown>;
          if (typeof a.url === "string") {
            return {
              url: a.url,
              mediaType: typeof a.mediaType === "string"
                ? a.mediaType
                : "application/octet-stream",
              key: a.key,
              iv: a.iv,
            };
          }
          return {
            url: `https://${domain}/api/files/messages/${msg._id}/${idx}`,
            mediaType: (a.mediaType as string) || "application/octet-stream",
            key: a.key as string | undefined,
            iv: a.iv as string | undefined,
          };
        })
        : undefined,
    };
    const wsType = isPublic ? "publicMessage" : "encryptedMessage";
    sendToUser(acct, { type: wsType, payload: newMsg });
    for (const t of recipients) {
      sendToUser(t, { type: wsType, payload: newMsg });
    }

    return c.json({ result: "sent", id: String(msg._id) });
  },
);

app.get("/users/:user/messages", authRequired, async (c) => {
  const acct = c.req.param("user");
  const [user, userDomain] = acct.split("@");
  if (!user || !userDomain) {
    return c.json({ error: "invalid user format" }, 400);
  }

  const actor = await resolveActorCached(
    acct,
    getEnv(c),
  );
  const actorId = actor?.id ?? `https://${userDomain}/users/${user}`;
  const partnerAcct = c.req.query("with");
  const [partnerUser, partnerDomain] = partnerAcct?.split("@") ?? [];
  const partnerActorObj = partnerAcct
    ? await resolveActorCached(
      partnerAcct,
      getEnv(c),
    )
    : null;
  let partnerActor = partnerActorObj?.id;
  if (!partnerActor && partnerUser && partnerDomain) {
    partnerActor = `https://${partnerDomain}/users/${partnerUser}`;
  }
  const domain = getDomain(c);

  const condition = partnerAcct
    ? {
      $or: [
        { from: partnerAcct, to: { $in: [actorId, acct] } },
        {
          from: acct,
          to: {
            $in: partnerActor ? [partnerActor, partnerAcct] : [partnerAcct],
          },
        },
      ],
    }
    : { to: { $in: [actorId, acct] } };

  const limit = Math.min(
    parseInt(c.req.query("limit") ?? "50", 10) || 50,
    100,
  );
  const before = c.req.query("before");
  const after = c.req.query("after");
  const db = createDB(getEnv(c));
  const privateList = await db.findEncryptedMessages(condition, {
    before: before ?? undefined,
    after: after ?? undefined,
    limit,
  }) as EncryptedMessageDoc[];
  const publicList = await db.findPublicMessages(condition, {
    before: before ?? undefined,
    after: after ?? undefined,
    limit,
  }) as EncryptedMessageDoc[];
  const list = [...privateList, ...publicList];
  list.sort((a, b) => {
    const dateA =
      typeof a.createdAt === "string" || typeof a.createdAt === "number" ||
        a.createdAt instanceof Date
        ? new Date(a.createdAt)
        : new Date(0);
    const dateB =
      typeof b.createdAt === "string" || typeof b.createdAt === "number" ||
        b.createdAt instanceof Date
        ? new Date(b.createdAt)
        : new Date(0);
    return dateA.getTime() - dateB.getTime();
  });
  list.reverse();
  const messages = list.slice(0, limit).map((doc) => ({
    id: String(doc._id),
    from: doc.from,
    to: doc.to,
    content: doc.content,
    mediaType: doc.mediaType,
    encoding: doc.encoding,
    createdAt: doc.createdAt,
    attachments:
      Array.isArray((doc.extra as Record<string, unknown>)?.attachments)
        ? (doc.extra as { attachments: unknown[] }).attachments.map(
          (att: unknown, idx: number) => {
            const a = att as Record<string, unknown>;
            if (typeof a.url === "string") {
              return {
                url: a.url,
                mediaType: typeof a.mediaType === "string"
                  ? a.mediaType
                  : "application/octet-stream",
                key: a.key,
                iv: a.iv,
              };
            }
            return {
              url: `https://${domain}/api/files/messages/${doc._id}/${idx}`,
              mediaType: (a.mediaType as string) || "application/octet-stream",
              key: a.key as string | undefined,
              iv: a.iv as string | undefined,
            };
          },
        )
        : undefined,
  }));
  return c.json(messages);
});

export default app;
