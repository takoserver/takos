import { z } from "zod";
import { eventManager } from "../eventManager.ts";
import {
  ActivityPubActor as _ActivityPubActor,
  ActivityPubObject,
  Follow,
} from "../models/activitypub.ts";
import { Account } from "../models/account.ts";
import { deliverActivity, getActor } from "../utils/activitypub.ts";
import { runActivityPubHooks } from "../utils/extensionsRuntime.ts";
import { getCookie } from "hono/cookie";
import { Session } from "../models/sessions.ts";
import { PluginActor } from "../models/pluginActor.ts";
import { ActivityPubActor as ActivityPubActorModel } from "../models/activitypub.ts";
import { generateKeyPair } from "../utils/crypto.ts";

eventManager.add(
  "takos",
  "activitypub:object",
  z.object({ context: z.string(), object: z.record(z.unknown()) }),
  async (_c, { context, object }) => {
    return await runActivityPubHooks(context, object);
  },
  "activitypub:receive:hook",
);

// deno-lint-ignore no-explicit-any
async function requireAuth(c: any) {
  const sessionToken = getCookie(c, "session_token");
  if (!sessionToken) throw new Error("認証されていません");
  const session = await Session.findOne({
    token: sessionToken,
    expiresAt: { $gt: new Date() },
  });
  if (!session) throw new Error("セッションが無効です");
  return session;
}

// ActivityPub オブジェクト送信
eventManager.add(
  "takos",
  "activitypub:send",
  z.object({ userId: z.string(), activity: z.record(z.unknown()) }),
  async (c, { userId, activity }) => {
    await requireAuth(c);
    const account = await Account.findById(userId);
    if (!account) throw new Error("アカウントが見つかりません");

    // 型安全な活動オブジェクト
    const typedActivity = activity as Record<string, unknown>;

    if (!typedActivity.id) {
      typedActivity.id =
        `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`;
    }
    typedActivity.actor = account.activityPubActor.id;
    const publishedDate = typedActivity.published || new Date().toISOString();
    typedActivity.published = publishedDate;

    await ActivityPubObject.create({
      id: String(typedActivity.id),
      type: String(typedActivity.type),
      actor: String(typedActivity.actor),
      object: typedActivity.object,
      target: typedActivity.target ? String(typedActivity.target) : undefined,
      to: Array.isArray(typedActivity.to) ? typedActivity.to.map(String) : [],
      cc: Array.isArray(typedActivity.cc) ? typedActivity.cc.map(String) : [],
      published: new Date(String(publishedDate)),
      content: typedActivity.content
        ? String(typedActivity.content)
        : undefined,
      summary: typedActivity.summary
        ? String(typedActivity.summary)
        : undefined,
      rawObject: typedActivity,
      isLocal: true,
      userId: account._id.toString(),
    });
    const ctx = typedActivity["@context"] ??
      "https://www.w3.org/ns/activitystreams";
    if (typedActivity.object && typeof typedActivity.object === "object") {
      const objectWithContext = typedActivity.object as Record<string, unknown>;
      typedActivity.object = await runActivityPubHooks(
        String(objectWithContext["@context"] ?? ctx),
        objectWithContext,
      );
    } else {
      const processed = await runActivityPubHooks(
        String(ctx),
        typedActivity,
      );
      Object.assign(typedActivity, processed);
    }

    const deliveryTargets = new Set<string>();
    const toArray = Array.isArray(typedActivity.to) ? typedActivity.to : [];
    const ccArray = Array.isArray(typedActivity.cc) ? typedActivity.cc : [];
    [...toArray, ...ccArray].forEach((target) => {
      if (
        typeof target === "string" &&
        !target.startsWith(`https://${c.env.ACTIVITYPUB_DOMAIN}/`)
      ) {
        deliveryTargets.add(target);
      }
    });
    for (const target of deliveryTargets) {
      const targetActor = await getActor(target, c.env.ACTIVITYPUB_DOMAIN);
      if (targetActor && targetActor.inbox) {
        // ActivityPubGenericObjectに必要なプロパティを確保
        const activityForDelivery = {
          type: String(typedActivity.type),
          id: String(typedActivity.id),
          actor: String(typedActivity.actor),
          object: typedActivity.object,
          to: toArray,
          cc: ccArray,
          ...typedActivity,
        };
        await deliverActivity(
          activityForDelivery,
          targetActor.inbox,
          `${account.activityPubActor.id}#main-key`,
          account.privateKeyPem,
        );
      }
    }

    return { id: typedActivity.id };
  },
  "activitypub:send",
);

// ActivityPub オブジェクト読み取り
eventManager.add(
  "takos",
  "activitypub:read",
  z.object({ id: z.string() }),
  async (_c, { id }) => {
    const activity = await ActivityPubObject.findOne({ id });
    if (!activity) throw new Error("アクティビティが見つかりません");
    return activity.rawObject;
  },
  "activitypub:read",
);

// ActivityPub オブジェクト削除
eventManager.add(
  "takos",
  "activitypub:delete",
  z.object({ id: z.string() }),
  async (c, { id }) => {
    await requireAuth(c);
    const activity = await ActivityPubObject.findOneAndDelete({
      id,
      isLocal: true,
    });
    if (!activity) throw new Error("アクティビティが見つかりません");
    const account = await Account.findById(activity.userId);
    if (account) {
      const _delAct = {
        "@context": "https://www.w3.org/ns/activitystreams",
        type: "Delete",
        id:
          `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`,
        actor: account.activityPubActor.id,
        object: {
          type: "Tombstone",
          id: activity.id,
          formerType: activity.type,
          deleted: new Date().toISOString(),
        },
        published: new Date().toISOString(),
      };
      // 配信省略
    }
    return { message: "deleted" };
  },
  "activitypub:send",
);

// ActivityPub オブジェクト一覧
eventManager.add(
  "takos",
  "activitypub:list",
  z.object({
    userId: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
  }),
  async (_c, { userId, page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};
    if (userId) query.userId = userId;
    const activities = await ActivityPubObject.find(query)
      .sort({ published: -1 })
      .skip(skip)
      .limit(limit)
      .select("id type actor published");
    return activities.map((a) => a.id);
  },
  "activitypub:read",
);

// アクター読み取り
eventManager.add(
  "takos",
  "activitypub:actor:read",
  z.object({ userId: z.string() }),
  async (_c, { userId }) => {
    const account = await Account.findById(userId);
    if (!account) throw new Error("アカウントが見つかりません");
    return account.activityPubActor;
  },
  "activitypub:actor:read",
);

// アクター更新
eventManager.add(
  "takos",
  "activitypub:actor:update",
  z.object({ userId: z.string(), key: z.string(), value: z.any() }),
  async (c, { userId, key, value }) => {
    await requireAuth(c);
    const account = await Account.findById(userId);
    if (!account) throw new Error("アカウントが見つかりません");
    // deno-lint-ignore no-explicit-any
    (account as any).activityPubActor[key] = value;
    account.markModified("activityPubActor");
    await account.save();
    return { message: "updated" };
  },
  "activitypub:actor:write",
);

// フォロー
eventManager.add(
  "takos",
  "activitypub:follow",
  z.object({ followerId: z.string(), followeeId: z.string() }),
  async (c, { followerId, followeeId }) => {
    await requireAuth(c);
    const followerAccount = await Account.findById(followerId);
    if (!followerAccount) {
      throw new Error("フォロワーアカウントが見つかりません");
    }
    const followActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Follow",
      id:
        `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`,
      actor: followerAccount.activityPubActor.id,
      object: followeeId,
      published: new Date().toISOString(),
    };
    await ActivityPubObject.create({
      id: followActivity.id,
      type: followActivity.type,
      actor: followActivity.actor,
      object: followActivity.object,
      published: new Date(followActivity.published),
      rawObject: followActivity,
      isLocal: true,
      userId: followerAccount._id.toString(),
    });
    const processedFollow = await runActivityPubHooks(
      String((followActivity as Record<string, unknown>)["@context"]) ??
        "https://www.w3.org/ns/activitystreams",
      followActivity as unknown as Record<string, unknown>,
    );
    Object.assign(followActivity, processedFollow);
    await Follow.create({
      follower: followerAccount.activityPubActor.id,
      following: followeeId,
      accepted: false,
      activityId: followActivity.id,
    });
    const targetActor = await getActor(followeeId, c.env.ACTIVITYPUB_DOMAIN);
    if (targetActor && targetActor.inbox) {
      await deliverActivity(
        followActivity,
        targetActor.inbox,
        `${followerAccount.activityPubActor.id}#main-key`,
        followerAccount.privateKeyPem,
      );
    }
    return { id: followActivity.id };
  },
  "activitypub:actor:write",
);

// アンフォロー
eventManager.add(
  "takos",
  "activitypub:unfollow",
  z.object({ followerId: z.string(), followeeId: z.string() }),
  async (c, { followerId, followeeId }) => {
    await requireAuth(c);
    const followerAccount = await Account.findById(followerId);
    if (!followerAccount) {
      throw new Error("フォロワーアカウントが見つかりません");
    }
    const existingFollow = await Follow.findOne({
      follower: followerAccount.activityPubActor.id,
      following: followeeId,
    });
    if (!existingFollow) throw new Error("フォロー関係が見つかりません");
    const undoActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Undo",
      id:
        `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`,
      actor: followerAccount.activityPubActor.id,
      object: {
        type: "Follow",
        id: existingFollow.activityId,
        actor: followerAccount.activityPubActor.id,
        object: followeeId,
      },
      published: new Date().toISOString(),
    };
    await Follow.deleteOne({ _id: existingFollow._id });
    const targetActor = await getActor(followeeId, c.env.ACTIVITYPUB_DOMAIN);
    if (targetActor && targetActor.inbox) {
      await deliverActivity(
        undoActivity,
        targetActor.inbox,
        `${followerAccount.activityPubActor.id}#main-key`,
        followerAccount.privateKeyPem,
      );
    }
    const processedUndo = await runActivityPubHooks(
      String((undoActivity as Record<string, unknown>)["@context"]) ??
        "https://www.w3.org/ns/activitystreams",
      undoActivity as unknown as Record<string, unknown>,
    );
    Object.assign(undoActivity, processedUndo);
    return { id: undoActivity.id };
  },
  "activitypub:actor:write",
);

// フォロワー一覧
eventManager.add(
  "takos",
  "activitypub:followers",
  z.object({ actorId: z.string() }),
  async (_c, { actorId }) => {
    const followers = await Follow.find({ following: actorId, accepted: true })
      .select("follower");
    return followers.map((f) => f.follower);
  },
  "activitypub:actor:read",
);

// フォロー中一覧
eventManager.add(
  "takos",
  "activitypub:following",
  z.object({ actorId: z.string() }),
  async (_c, { actorId }) => {
    const following = await Follow.find({ follower: actorId, accepted: true })
      .select("following");
    return following.map((f) => f.following);
  },
  "activitypub:actor:read",
);

// ---------------------------------------------------------------------------
// Plugin Actors
// ---------------------------------------------------------------------------

eventManager.add(
  "takos",
  "plugin-actor:create",
  z.object({
    identifier: z.string(),
    localName: z.string(),
    profile: z.record(z.unknown()),
  }),
  async (c, { identifier, localName, profile }) => {
    const iri =
      `https://${c.env.ACTIVITYPUB_DOMAIN}/plugins/${identifier}/${localName}`;
    const { publicKeyPem, privateKeyPem } = await generateKeyPair();
    const actor: Record<string, unknown> = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: iri,
      type: typeof profile.type === "string" ? profile.type : "Service",
      preferredUsername: localName,
      inbox: `${iri}/inbox`,
      outbox: `${iri}/outbox`,
      followers: `${iri}/followers`,
      following: `${iri}/following`,
      ...profile,
      publicKey: {
        id: `${iri}#main-key`,
        owner: iri,
        publicKeyPem,
      },
    };

    await PluginActor.create({
      identifier,
      localName,
      iri,
      actor,
      privateKeyPem,
    });

    await ActivityPubActorModel.create({
      id: iri,
      type: String(actor.type),
      preferredUsername: localName,
      name: actor.name,
      summary: actor.summary,
      icon: actor.icon,
      image: actor.image,
      inbox: `${iri}/inbox`,
      outbox: `${iri}/outbox`,
      followers: `${iri}/followers`,
      following: `${iri}/following`,
      publicKey: actor.publicKey,
      privateKeyPem,
      isLocal: true,
      rawActor: actor,
    });

    return iri;
  },
  "plugin-actor:create",
);

eventManager.add(
  "takos",
  "plugin-actor:read",
  z.object({ identifier: z.string(), iri: z.string() }),
  async (_c, { identifier, iri }) => {
    const doc = await PluginActor.findOne({ identifier, iri });
    if (!doc) throw new Error("Plugin actor not found");
    return doc.actor as Record<string, unknown>;
  },
  "plugin-actor:read",
);

eventManager.add(
  "takos",
  "plugin-actor:update",
  z.object({
    identifier: z.string(),
    iri: z.string(),
    partial: z.record(z.unknown()),
  }),
  async (_c, { identifier, iri, partial }) => {
    const doc = await PluginActor.findOne({ identifier, iri });
    if (!doc) throw new Error("Plugin actor not found");
    Object.assign(doc.actor, partial);
    await doc.save();
    await ActivityPubActorModel.updateOne({ id: iri }, {
      $set: { rawActor: doc.actor },
    });
    return { success: true };
  },
  "plugin-actor:write",
);

eventManager.add(
  "takos",
  "plugin-actor:delete",
  z.object({ identifier: z.string(), iri: z.string() }),
  async (_c, { identifier, iri }) => {
    await PluginActor.findOneAndDelete({ identifier, iri });
    await ActivityPubActorModel.deleteOne({ id: iri });
    return { success: true };
  },
  "plugin-actor:delete",
);

eventManager.add(
  "takos",
  "plugin-actor:list",
  z.object({ identifier: z.string() }),
  async (_c, { identifier }) => {
    const docs = await PluginActor.find({ identifier }).select("iri");
    return docs.map((d) => d.iri);
  },
  "plugin-actor:read",
);
