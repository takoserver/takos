import { Hono } from "hono";
import { Env } from "./index.ts";
import {
  ActivityPubActor as _ActivityPubActor,
  ActivityPubObject,
  Community as _Community,
  Follow,
} from "./models/activitypub.ts";
import {
  ActivityPubActivity,
  VerificationResult,
} from "./types/activitypub.ts";
import { Account } from "./models/account.ts";
import {
  calculateDeliveryTargets,
  deliverActivity,
  getActor,
  isLocalActor as _isLocalActor,
  processAccept,
  processFollow,
  processUndo,
  validateActivityPubObject as _validateActivityPubObject,
  verifyIncomingActivity,
} from "./utils/activitypub.ts";
import { runActivityPubHooks } from "./utils/extensionsRuntime.ts";
import { eventManager } from "./eventManager.ts";

const app = new Hono<{ Bindings: Env }>();

// Well-known エンドポイント
app.get("/.well-known/webfinger", async (c) => {
  const resource = c.req.query("resource");
  if (!resource) {
    return c.json({ error: "Missing resource parameter" }, 400);
  }

  // acct:username@domain 形式をパース
  const match = resource.match(/^acct:([^@]+)@(.+)$/);
  if (!match) {
    return c.json({ error: "Invalid resource format" }, 400);
  }

  const [, username, domain] = match;
  if (domain !== c.env.ACTIVITYPUB_DOMAIN) {
    return c.json({ error: "Domain not found" }, 404);
  }

  // アカウント検索
  const account = await Account.findOne({ name: username });
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }

  return c.json({
    subject: resource,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: account.activityPubActor.id,
      },
    ],
  });
});

// アクター情報取得
app.get("/users/:username", async (c) => {
  const username = c.req.param("username");
  const account = await Account.findOne({ name: username });

  if (!account) {
    return c.json({ error: "Not found" }, 404);
  }

  c.header("Content-Type", "application/activity+json");
  return c.json(account.activityPubActor);
});

// Inbox エンドポイント（個人）
app.post("/users/:username/inbox", async (c) => {
  try {
    const username = c.req.param("username");
    const body = await c.req.text();

    // アカウント確認
    const account = await Account.findOne({ name: username });
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // 包括的な検証（HTTP署名、Digest、ActivityPub形式）
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const rawVerification = await verifyIncomingActivity(
      "POST",
      c.req.url,
      headers,
      body,
    );

    const verification: VerificationResult = {
      valid: rawVerification.valid,
      actorId: rawVerification.actorId,
      activity: rawVerification.activity as ActivityPubActivity,
      error: rawVerification.valid ? undefined : "Verification failed",
    };

    if (!verification.valid || !verification.activity) {
      console.warn("Invalid incoming activity:", verification);
      return c.json({ error: "Invalid activity or signature" }, 400);
    }

    const activity: ActivityPubActivity = verification.activity;

    // アクティビティをデータベースに保存
    await ActivityPubObject.create({
      id: activity.id,
      type: activity.type,
      actor: activity.actor,
      object: activity.object,
      target: activity.target,
      to: activity.to,
      cc: activity.cc,
      published: activity.published || new Date(),
      content: activity.content,
      summary: activity.summary,
      rawObject: activity,
      isLocal: false,
      userId: account._id.toString(),
    });
    const apContext = (activity as Record<string, unknown>)["@context"] ??
      "https://www.w3.org/ns/activitystreams";
    if (activity.object && typeof activity.object === "object") {
      activity.object = await runActivityPubHooks(
        String((activity.object as Record<string, unknown>)["@context"]) ??
          String(apContext),
        activity.object as Record<string, unknown>,
      );
    } else {
      const processed = await runActivityPubHooks(
        String(apContext),
        activity as unknown as Record<string, unknown>,
      );
      Object.assign(activity, processed);
    }

    // 標準的なアクティビティ処理
    switch (activity.type) {
      case "Follow":
        await processFollow(activity);

        // 自動承認の場合
        if (account.activityPubActor.manuallyApprovesFollowers !== true) {
          const acceptActivity = {
            "@context": "https://www.w3.org/ns/activitystreams",
            type: "Accept",
            id:
              `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`,
            actor: account.activityPubActor.id,
            object: activity,
          };
          // Accept を配信
          const senderActor = await getActor(
            activity.actor,
            c.env.ACTIVITYPUB_DOMAIN,
          );
          if (senderActor && senderActor.inbox) {
            await deliverActivity(
              acceptActivity,
              senderActor.inbox,
              `${account.activityPubActor.id}#main-key`,
              account.privateKeyPem,
            );
          }
        }
        break;

      case "Accept":
        await processAccept(activity);
        break;

      case "Undo":
        await processUndo(activity);
        break;
    }

    try {
      await eventManager.trigger(
        c,
        "takos",
        "activitypub:object",
        { context: String(apContext), object: activity },
      );
    } catch (err) {
      console.error("activitypub:object dispatch failed", err);
    }

    return c.json({ status: "accepted" });
  } catch (error) {
    console.error("Inbox processing error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Outbox エンドポイント（個人）
app.get("/users/:username/outbox", async (c) => {
  const username = c.req.param("username");
  const account = await Account.findOne({ name: username });

  if (!account) {
    return c.json({ error: "Not found" }, 404);
  }

  // ページング対応
  const page = parseInt(c.req.query("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const activities = await ActivityPubObject.find({
    userId: account._id.toString(),
    isLocal: true,
  })
    .sort({ published: -1 })
    .skip(skip)
    .limit(limit);

  const totalItems = await ActivityPubObject.countDocuments({
    userId: account._id.toString(),
    isLocal: true,
  });

  c.header("Content-Type", "application/activity+json");
  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    id: `https://${c.env.ACTIVITYPUB_DOMAIN}/users/${username}/outbox`,
    totalItems,
    orderedItems: activities.map((activity) => activity.rawObject),
  });
});

// アクティビティ送信
app.post("/users/:username/outbox", async (c) => {
  try {
    const username = c.req.param("username");
    const activity = await c.req.json();

    const account = await Account.findOne({ name: username });
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // アクティビティにIDを割り当て
    if (!activity.id) {
      activity.id =
        `https://${c.env.ACTIVITYPUB_DOMAIN}/activities/${crypto.randomUUID()}`;
    }

    // アクターを設定
    activity.actor = account.activityPubActor.id;

    const processedActivity = activity;

    // データベースに保存
    await ActivityPubObject.create({
      id: processedActivity.id,
      type: processedActivity.type,
      actor: processedActivity.actor,
      object: processedActivity.object,
      target: processedActivity.target,
      to: processedActivity.to,
      cc: processedActivity.cc,
      published: processedActivity.published || new Date(),
      content: processedActivity.content,
      summary: processedActivity.summary,
      rawObject: processedActivity,
      isLocal: true,
      userId: account._id.toString(),
    });
    const context =
      (processedActivity as Record<string, unknown>)["@context"] ??
        "https://www.w3.org/ns/activitystreams";
    if (
      processedActivity.object &&
      typeof processedActivity.object === "object"
    ) {
      processedActivity.object = await runActivityPubHooks(
        String(
          (processedActivity.object as Record<string, unknown>)["@context"],
        ) ??
          String(context),
        processedActivity.object as Record<string, unknown>,
      );
    } else {
      const processed = await runActivityPubHooks(
        String(context),
        processedActivity as unknown as Record<string, unknown>,
      );
      Object.assign(processedActivity, processed);
    }

    // 配信先を計算
    const deliveryTargets = calculateDeliveryTargets(
      processedActivity,
      c.env.ACTIVITYPUB_DOMAIN,
    );
    // 各配信先に送信
    for (const target of deliveryTargets) {
      const targetActor = await getActor(target, c.env.ACTIVITYPUB_DOMAIN);
      if (targetActor && targetActor.inbox) {
        await deliverActivity(
          processedActivity,
          targetActor.inbox,
          `${account.activityPubActor.id}#main-key`,
          account.privateKeyPem,
        );
      }
    }

    return c.json({
      id: processedActivity.id,
      status: "published",
    }, 201);
  } catch (error) {
    console.error("Outbox processing error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// フォロワー一覧
app.get("/users/:username/followers", async (c) => {
  const username = c.req.param("username");
  const account = await Account.findOne({ name: username });

  if (!account) {
    return c.json({ error: "Not found" }, 404);
  }

  const followers = await Follow.find({
    following: account.activityPubActor.id,
    accepted: true,
  }).select("follower");

  c.header("Content-Type", "application/activity+json");
  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    id: `https://${c.env.ACTIVITYPUB_DOMAIN}/users/${username}/followers`,
    totalItems: followers.length,
    orderedItems: followers.map((f) => f.follower),
  });
});

// フォロー中一覧
app.get("/users/:username/following", async (c) => {
  const username = c.req.param("username");
  const account = await Account.findOne({ name: username });

  if (!account) {
    return c.json({ error: "Not found" }, 404);
  }

  const following = await Follow.find({
    follower: account.activityPubActor.id,
    accepted: true,
  }).select("following");

  c.header("Content-Type", "application/activity+json");
  return c.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "OrderedCollection",
    id: `https://${c.env.ACTIVITYPUB_DOMAIN}/users/${username}/following`,
    totalItems: following.length,
    orderedItems: following.map((f) => f.following),
  });
});

// 共有 Inbox エンドポイント
app.post("/inbox", async (c) => {
  try {
    const body = await c.req.text();
    // 包括的な検証（HTTP署名、Digest、ActivityPub形式）
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const rawVerification = await verifyIncomingActivity(
      "POST",
      c.req.url,
      headers,
      body,
    );

    const verification: VerificationResult = {
      valid: rawVerification.valid,
      actorId: rawVerification.actorId,
      activity: rawVerification.activity as ActivityPubActivity,
      error: rawVerification.valid ? undefined : "Verification failed",
    };

    if (!verification.valid || !verification.activity) {
      console.warn("Invalid incoming activity to shared inbox:", verification);
      return c.json({ error: "Invalid activity or signature" }, 400);
    }

    const activity: ActivityPubActivity = verification.activity;

    // アクティビティをデータベースに保存（共有inboxは特定ユーザーに紐づかない）
    await ActivityPubObject.create({
      id: activity.id,
      type: activity.type,
      actor: activity.actor,
      object: activity.object,
      target: activity.target,
      to: activity.to,
      cc: activity.cc,
      published: activity.published || new Date(),
      content: activity.content,
      summary: activity.summary,
      rawObject: activity,
      isLocal: false,
      // userIdは設定しない（共有inboxのため）
    });
    const sharedCtx = (activity as Record<string, unknown>)["@context"] ??
      "https://www.w3.org/ns/activitystreams";
    if (activity.object && typeof activity.object === "object") {
      activity.object = await runActivityPubHooks(
        String((activity.object as Record<string, unknown>)["@context"]) ??
          String(sharedCtx),
        activity.object as Record<string, unknown>,
      );
    } else {
      const processed = await runActivityPubHooks(
        String(sharedCtx),
        activity as unknown as Record<string, unknown>,
      );
      Object.assign(activity, processed);
    }

    // 標準的なアクティビティ処理
    switch (activity.type) {
      case "Follow":
        await processFollow(activity);
        break;

      case "Accept":
        await processAccept(activity);
        break;

      case "Undo":
        await processUndo(activity);
        break;

      case "Delete": // 削除処理
        if (activity.object) {
          const objectId = typeof activity.object === "string"
            ? activity.object
            : (activity.object as { id?: string })?.id;
          if (objectId) {
            await ActivityPubObject.updateMany(
              { "rawObject.id": objectId },
              { $set: { deleted: true } },
            );
          }
        }
        break;

      default:
        // その他のアクティビティは保存のみ
        console.log(`Received activity type: ${activity.type}`);
    }

    try {
      await eventManager.trigger(
        c,
        "takos",
        "activitypub:object",
        { context: String(sharedCtx), object: activity },
      );
    } catch (err) {
      console.error("activitypub:object dispatch failed", err);
    }

    return c.json({ status: "accepted" });
  } catch (error) {
    console.error("Shared inbox processing error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
