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

      const obj = activity.object as Record<string, unknown>;
      const types = Array.isArray(obj.type) ? obj.type as string[] : [
        obj.type as string,
      ];

      if (types.includes("x:Story")) {
        const endTime = obj.endTime
          ? new Date(obj.endTime as string)
          : undefined;
        if (endTime && endTime <= new Date()) return;
        await createDB(env).saveObject({
          type: "Story",
          attributedTo: obj.attributedTo ?? actor,
          content: obj.content,
          endTime,
          x_overlays: Array.isArray(obj["x:overlays"]) ? obj["x:overlays"] : [],
          x_rev: obj["x:rev"] as number | undefined,
          published: obj.published
            ? new Date(obj.published as string)
            : new Date(),
          actor_id: actor,
          extra: obj.extra ?? {},
          aud: { to: [], cc: [] },
        });
        return;
      }

      const saved = await saveObject(env, obj, actor);
      const domain = getDomain(c as Context);
      const userInfo = await getUserInfo(
        (saved.actor_id as string) ?? actor,
        domain,
        env,
      );
      const formatted = formatUserInfoForPost(userInfo, saved);
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

  async Delete(
    activity: Record<string, unknown>,
    _username: string,
    c: unknown,
  ) {
    const env = (c as { get: (k: string) => unknown }).get("env") as Record<
      string,
      string
    >;
    let objectId = "";
    if (typeof activity.object === "string") {
      objectId = activity.object;
    } else if (
      typeof activity.object === "object" &&
      activity.object !== null &&
      typeof (activity.object as Record<string, unknown>).id === "string"
    ) {
      objectId = (activity.object as Record<string, unknown>).id as string;
    }
    if (!objectId) return;
    const db = createDB(env);
    const stored = await db.getObject(objectId);
    if (!stored) return;
    const types = Array.isArray((stored as { type?: unknown }).type)
      ? (stored as { type: string[] }).type
      : [(stored as { type?: unknown }).type as string];
    if (
      !types.includes("x:Story") &&
      (stored as { type?: string }).type !== "Story"
    ) {
      return;
    }
    await db.updateObject(objectId, {
      type: "Tombstone",
      deleted_at: new Date(),
    });
  },
};
