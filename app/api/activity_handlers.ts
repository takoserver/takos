import type { Context } from "hono";
import { createDB } from "./DB/mod.ts";
import {
  createAcceptActivity,
  deliverActivityPubObject,
  extractAttachments,
  getDomain,
} from "./utils/activitypub.ts";
import { broadcast, sendToUser } from "./routes/ws.ts";
import { formatUserInfoForPost, getUserInfo } from "./services/user-info.ts";
import { saveFile } from "./services/file.ts";
import { fetchBearcap } from "./utils/bearcap.ts";

export type ActivityHandler = (
  activity: Record<string, unknown>,
  username: string,
  c: unknown,
) => Promise<void>;

async function saveObject(
  env: Record<string, string>,
  obj: Record<string, unknown>,
  actor: string,
): Promise<Record<string, unknown>> {
  // 外部ユーザーの情報を抽出
  let actorInfo = {};
  if (typeof actor === "string" && actor.startsWith("http")) {
    // ActivityPubオブジェクトから追加のactor情報を試みる
    if (obj.attributedTo && typeof obj.attributedTo === "object") {
      const actorObj = obj.attributedTo as Record<string, unknown>;
      actorInfo = {
        name: actorObj.name,
        preferredUsername: actorObj.preferredUsername,
        icon: typeof actorObj.icon === "object" && actorObj.icon !== null
          ? (actorObj.icon as Record<string, unknown>).url
          : actorObj.icon,
        summary: actorObj.summary,
      };
    }
  }

  const attachments = extractAttachments(obj);
  const extra: Record<string, unknown> = {
    ...(obj.extra ?? {}),
    actorInfo: Object.keys(actorInfo).length > 0 ? actorInfo : undefined,
  };
  if (attachments.length > 0) extra.attachments = attachments;

  const db = createDB(env);
  return await db.saveObject({
    type: obj.type ?? "Note",
    attributedTo: typeof obj.attributedTo === "string"
      ? obj.attributedTo
      : actor,
    content: obj.content,
    to: Array.isArray(obj.to) ? obj.to : [],
    cc: Array.isArray(obj.cc) ? obj.cc : [],
    published: obj.published && typeof obj.published === "string"
      ? new Date(obj.published)
      : new Date(),
    raw: obj,
    extra,
  });
}

export const activityHandlers: Record<string, ActivityHandler> = {
  async Create(
    activity: Record<string, unknown>,
    username: string,
    c: unknown,
  ) {
    if (typeof activity.object === "object" && activity.object !== null) {
      const actor = typeof activity.actor === "string"
        ? activity.actor
        : username;
      const env = (c as { get: (k: string) => unknown }).get("env") as Record<
        string,
        string
      >;
      const saved = await saveObject(
        env,
        activity.object as Record<string, unknown>,
        actor,
      );
      const domain = getDomain(c as Context);
      const userInfo = await getUserInfo(
        (saved.actor_id as string) ?? actor,
        domain,
        env,
      );
      const formatted = formatUserInfoForPost(
        userInfo,
        saved,
      );
      broadcast({
        type: "newPost",
        payload: { timeline: "latest", post: formatted },
      });
      sendToUser(`${username}@${domain}`, {
        type: "newPost",
        payload: { timeline: "following", post: formatted },
      });
    }
  },

  async Follow(
    activity: Record<string, unknown>,
    username: string,
    c: unknown,
  ) {
    if (typeof activity.actor !== "string") return;
    const env = (c as { get: (k: string) => unknown }).get("env") as Record<
      string,
      string
    >;
    const db = createDB(env);
    await db.addFollowerByName(username, activity.actor);
    await db.follow(username, activity.actor);
    const domain = getDomain(c as Context);
    const accept = createAcceptActivity(
      domain,
      `https://${domain}/users/${username}`,
      activity,
    );
    deliverActivityPubObject(
      [activity.actor],
      accept,
      username,
      domain,
      env,
    ).catch(
      (err) => {
        console.error("Delivery failed:", err);
      },
    );
  },

  async Add(activity: Record<string, unknown>, username: string, c: unknown) {
    if (typeof activity.object !== "object" || !activity.object) return;
    const obj = activity.object as Record<string, unknown>;
    if (obj.type !== "Story") return;
    const env = (c as { get: (k: string) => unknown }).get("env") as Record<
      string,
      string
    >;
    let mediaUrl: string | undefined;
    if (typeof obj.object === "string" && obj.object.startsWith("bear:")) {
      const data = await fetchBearcap(obj.object);
      if (data) {
        const saved = await saveFile(data, env);
        mediaUrl = saved.url;
      }
    }
    const db = createDB(env);
    await db.saveObject({
      _id: typeof obj.id === "string" ? obj.id : undefined,
      type: "Story",
      attributedTo: typeof activity.actor === "string"
        ? activity.actor
        : username,
      content: "",
      published: new Date(),
      extra: {
        mediaUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      actor_id: typeof activity.actor === "string" ? activity.actor : username,
      raw: activity,
    });
  },

  async Delete(
    activity: Record<string, unknown>,
    _username: string,
    c: unknown,
  ) {
    if (typeof activity.object !== "object" || !activity.object) return;
    const obj = activity.object as Record<string, unknown>;
    if (obj.type !== "Story") return;
    const id = typeof obj.id === "string" ? obj.id : null;
    if (!id) return;
    const env = (c as { get: (k: string) => unknown }).get("env") as Record<
      string,
      string
    >;
    const db = createDB(env);
    await db.updateObject(id, { type: "Tombstone", deleted_at: new Date() });
  },
};
