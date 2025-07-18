import { Hono } from "hono";
import KeyPackage from "./models/key_package.ts";
import EncryptedMessage from "./models/encrypted_message.ts";
import PublicMessage from "./models/public_message.ts";
import EncryptedKeyPair from "./models/encrypted_keypair.ts";
import { saveObject } from "./services/unified_store.ts";
import Account from "./models/account.ts";
import authRequired from "./utils/auth.ts";
import { getEnv } from "../../shared/config.ts";
import { rateLimit } from "./utils/rate_limit.ts";
import {
  type ActivityPubActor,
  buildActivityFromStored,
  createAddActivity,
  createCreateActivity,
  createDeleteActivity,
  createRemoveActivity,
  deliverActivityPubObject,
  fetchActorInbox,
  fetchJson,
  getDomain,
  resolveActor,
} from "./utils/activitypub.ts";

interface ActivityPubActivity {
  [key: string]: unknown;
  "@context"?: unknown;
  to?: unknown;
  cc?: unknown;
}
import RemoteActor from "./models/remote_actor.ts";

async function resolveActorCached(
  acct: string,
  env: Record<string, string>,
) {
  const [name, host] = acct.split("@");
  if (!name || !host) return null;

  const hostRegex = new RegExp(
    `^https?://${host.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}/`,
  );
  const cached = await RemoteActor.findOne({
    preferredUsername: name,
    actorUrl: { $regex: hostRegex },
  }).lean();

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
      await RemoteActor.findOneAndUpdate(
        { actorUrl: actor.id },
        {
          name: actor.name || "",
          preferredUsername: actor.preferredUsername || "",
          icon: actor.icon || null,
          summary: actor.summary || "",
          cachedAt: new Date(),
        },
        { upsert: true },
      );
    }
  }

  return actor;
}

const app = new Hono();

async function deliverToFollowers(
  env: Record<string, string>,
  user: string,
  activity: unknown,
  domain: string,
) {
  const account = await Account.findOne({ userName: user }).lean();
  if (!account || !account.followers) return;
  const followerInboxes = await Promise.all(
    account.followers.map(async (actorUrl: string) => {
      try {
        const url = new URL(actorUrl);
        if (url.host === domain && url.pathname.startsWith("/users/")) {
          return null;
        }
        return await fetchActorInbox(actorUrl, env);
      } catch {
        return null;
      }
    }),
  );
  const validInboxes = followerInboxes.filter((i): i is string =>
    typeof i === "string" && !!i
  );
  if (validInboxes.length > 0) {
    deliverActivityPubObject(validInboxes, activity, user, domain, env)
      .catch(
        (err) => {
          console.error("Delivery failed:", err);
        },
      );
  }
}

app.get("/users/:user/keyPackages", async (c) => {
  const acct = c.req.param("user");
  const domain = getDomain(c);

  const [user, host] = acct.split("@");
  if (!user || !host) {
    return c.json({ error: "invalid user format" }, 400);
  }

  if (host === domain) {
    const list = await KeyPackage.find({ userName: acct }).lean();
    const items = list.map((doc) => ({
      id: `https://${domain}/users/${user}/keyPackage/${doc._id}`,
      type: "KeyPackage",
      content: doc.content,
      mediaType: doc.mediaType,
      encoding: doc.encoding,
      createdAt: doc.createdAt,
    }));
    return c.json({ type: "Collection", items });
  }

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

app.get("/users/:user/keyPackage/:keyId", async (c) => {
  const user = c.req.param("user");
  const keyId = c.req.param("keyId");
  const doc = await KeyPackage.findOne({ _id: keyId, userName: user }).lean();
  if (!doc) return c.body("Not Found", 404);
  const domain = getDomain(c);
  const object = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ],
    id: `https://${domain}/users/${user}/keyPackage/${keyId}`,
    type: "KeyPackage",
    attributedTo: `https://${domain}/users/${user}`,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    mediaType: doc.mediaType,
    encoding: doc.encoding,
    content: doc.content,
  };
  return c.json(object);
});

app.post("/users/:user/keyPackages", authRequired, async (c) => {
  const user = c.req.param("user");
  const { content, mediaType, encoding } = await c.req.json();
  if (typeof content !== "string") {
    return c.json({ error: "content is required" }, 400);
  }
  const pkg = await KeyPackage.create({
    userName: user,
    content,
    mediaType: mediaType ?? "message/mls",
    encoding: encoding ?? "base64",
  });
  const domain = getDomain(c);
  const actorId = `https://${domain}/users/${user}`;
  const keyObj = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ],
    id: `https://${domain}/users/${user}/keyPackage/${pkg._id}`,
    type: "KeyPackage",
    attributedTo: actorId,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    mediaType: pkg.mediaType,
    encoding: pkg.encoding,
    content: pkg.content,
  };
  const addActivity = createAddActivity(domain, actorId, keyObj);
  await deliverToFollowers(getEnv(c), user, addActivity, domain);
  return c.json({ result: "ok", keyId: pkg._id.toString() });
});

app.delete("/users/:user/keyPackages/:keyId", authRequired, async (c) => {
  const user = c.req.param("user");
  const keyId = c.req.param("keyId");
  await KeyPackage.deleteOne({ _id: keyId, userName: user });
  const domain = getDomain(c);
  const actorId = `https://${domain}/users/${user}`;
  const removeActivity = createRemoveActivity(
    domain,
    actorId,
    `https://${domain}/users/${user}/keyPackage/${keyId}`,
  );
  const deleteActivity = createDeleteActivity(
    domain,
    actorId,
    `https://${domain}/users/${user}/keyPackage/${keyId}`,
  );
  await deliverToFollowers(getEnv(c), user, removeActivity, domain);
  await deliverToFollowers(getEnv(c), user, deleteActivity, domain);
  return c.json({ result: "removed" });
});

app.get("/users/:user/encryptedKeyPair", async (c) => {
  const user = c.req.param("user");
  const doc = await EncryptedKeyPair.findOne({ userName: user }).lean();
  if (!doc) return c.json({ content: null });
  return c.json({ content: doc.content });
});

app.post("/users/:user/encryptedKeyPair", authRequired, async (c) => {
  const user = c.req.param("user");
  const { content } = await c.req.json();
  if (typeof content !== "string") {
    return c.json({ error: "invalid body" }, 400);
  }
  await EncryptedKeyPair.findOneAndUpdate({ userName: user }, { content }, {
    upsert: true,
  });
  return c.json({ result: "ok" });
});

app.delete("/users/:user/encryptedKeyPair", authRequired, async (c) => {
  const user = c.req.param("user");
  await EncryptedKeyPair.deleteOne({ userName: user });
  return c.json({ result: "removed" });
});

app.post("/users/:user/resetKeys", authRequired, async (c) => {
  const user = c.req.param("user");
  const domain = getDomain(c);
  const actorId = `https://${domain}/users/${user}`;
  const keyPkgs = await KeyPackage.find({ userName: user }).lean();
  for (const pkg of keyPkgs) {
    const removeActivity = createRemoveActivity(
      domain,
      actorId,
      `https://${domain}/users/${user}/keyPackage/${pkg._id}`,
    );
    const deleteActivity = createDeleteActivity(
      domain,
      actorId,
      `https://${domain}/users/${user}/keyPackage/${pkg._id}`,
    );
    await deliverToFollowers(getEnv(c), user, removeActivity, domain);
    await deliverToFollowers(getEnv(c), user, deleteActivity, domain);
  }
  await KeyPackage.deleteMany({ userName: user });
  await EncryptedKeyPair.deleteOne({ userName: user });
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
    const { to, content, mediaType, encoding } = await c.req.json();
    if (!Array.isArray(to) || typeof content !== "string") {
      return c.json({ error: "invalid body" }, 400);
    }
    const msg = await EncryptedMessage.create({
      from: acct,
      to,
      content,
      mediaType: mediaType ?? "message/mls",
      encoding: encoding ?? "base64",
    });
    const domain = getDomain(c);
    const actorId = `https://${domain}/users/${sender}`;
    const object = await saveObject(
      getEnv(c),
      {
        type: "PrivateMessage",
        attributedTo: acct,
        content,
        to,
        extra: { mediaType: msg.mediaType, encoding: msg.encoding },
        actor_id: actorId,
        aud: { to, cc: [] },
      },
    );

    const privateMessage = buildActivityFromStored(
      object.toObject() as {
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
    (privateMessage as ActivityPubActivity)["@context"] = [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ];

    const activity = createCreateActivity(domain, actorId, privateMessage);
    (activity as ActivityPubActivity)["@context"] = [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ];
    // 個別配信
    (activity as ActivityPubActivity).to = to;
    (activity as ActivityPubActivity).cc = [];
    deliverActivityPubObject(to, activity, sender, domain, getEnv(c)).catch(
      (err) => {
        console.error("deliver failed", err);
      },
    );

    return c.json({ result: "sent", id: msg._id.toString() });
  },
);

app.post(
  "/users/:user/publicMessages",
  authRequired,
  rateLimit({ windowMs: 60_000, limit: 20 }),
  async (c) => {
    const acct = c.req.param("user");
    const [sender, senderDomain] = acct.split("@");
    if (!sender || !senderDomain) {
      return c.json({ error: "invalid user format" }, 400);
    }
    const { to, content, mediaType, encoding } = await c.req.json();
    if (!Array.isArray(to) || typeof content !== "string") {
      return c.json({ error: "invalid body" }, 400);
    }
    const msg = await PublicMessage.create({
      from: acct,
      to,
      content,
      mediaType: mediaType ?? "message/mls",
      encoding: encoding ?? "base64",
    });
    const domain = getDomain(c);
    const actorId = `https://${domain}/users/${sender}`;
    const object = await saveObject(
      getEnv(c),
      {
        type: "PublicMessage",
        attributedTo: acct,
        content,
        to,
        extra: { mediaType: msg.mediaType, encoding: msg.encoding },
        actor_id: actorId,
        aud: { to, cc: [] },
      },
    );

    const publicMessage = buildActivityFromStored(
      object.toObject() as {
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
    (publicMessage as ActivityPubActivity)["@context"] = [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ];

    const activity = createCreateActivity(domain, actorId, publicMessage);
    (activity as ActivityPubActivity)["@context"] = [
      "https://www.w3.org/ns/activitystreams",
      "https://purl.archive.org/socialweb/mls",
    ];
    (activity as ActivityPubActivity).to = to;
    (activity as ActivityPubActivity).cc = [];
    deliverActivityPubObject(to, activity, sender, domain, getEnv(c)).catch(
      (err) => {
        console.error("deliver failed", err);
      },
    );

    return c.json({ result: "sent", id: msg._id.toString() });
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
  const query = EncryptedMessage.find(condition);
  if (before) {
    query.where("createdAt").lt(new Date(before) as unknown as number);
  }
  if (after) {
    query.where("createdAt").gt(new Date(after) as unknown as number);
  }
  const list = await query.sort({ createdAt: -1 }).limit(limit).lean();
  list.reverse();
  const messages = list.map((doc) => ({
    id: doc._id.toString(),
    from: doc.from,
    to: doc.to,
    content: doc.content,
    mediaType: doc.mediaType,
    encoding: doc.encoding,
    createdAt: doc.createdAt,
  }));
  return c.json(messages);
});

app.get("/users/:user/publicMessages", authRequired, async (c) => {
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
  const query = PublicMessage.find(condition);
  if (before) {
    query.where("createdAt").lt(new Date(before) as unknown as number);
  }
  if (after) {
    query.where("createdAt").gt(new Date(after) as unknown as number);
  }
  const list = await query.sort({ createdAt: -1 }).limit(limit).lean();
  list.reverse();
  const messages = list.map((doc) => ({
    id: doc._id.toString(),
    from: doc.from,
    to: doc.to,
    content: doc.content,
    mediaType: doc.mediaType,
    encoding: doc.encoding,
    createdAt: doc.createdAt,
  }));
  return c.json(messages);
});

export default app;
