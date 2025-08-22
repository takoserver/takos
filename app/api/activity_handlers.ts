import type { Context } from "hono";
import { createDB } from "./DB/mod.ts";
import {
  createAcceptActivity,
  deliverActivityPubObject,
  extractAttachments,
  getDomain,
} from "./utils/activitypub.ts";
import { sendToUser } from "./routes/ws.ts";

export type ActivityHandler = (
  activity: Record<string, unknown>,
  username: string,
  c: unknown,
) => Promise<unknown>;

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
  }) as unknown as Record<string, unknown>;
}

export const activityHandlers: Record<string, ActivityHandler> = {
  async Create(
    activity: Record<string, unknown>,
    username: string,
    c: unknown,
  ) {
    if (typeof activity.object !== "object" || activity.object === null) {
      return;
    }
    const obj = activity.object as Record<string, unknown>;
    const toRaw = Array.isArray(activity.to)
      ? activity.to
      : activity.to
      ? [activity.to]
      : [];
    const objToRaw = Array.isArray(obj.to) ? obj.to : obj.to ? [obj.to] : [];
    const recipients = [...toRaw, ...objToRaw].filter((v): v is string =>
      typeof v === "string"
    );
    const validRecipients = recipients.filter((iri) => {
      if (iri === "https://www.w3.org/ns/activitystreams#Public") return false;
      try {
        const u = new URL(iri);
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.includes("followers")) return false;
      } catch {
        if (iri.includes("/followers")) return false;
      }
      return true;
    });
    const env = (c as { get: (k: string) => unknown }).get("env") as Record<
      string,
      string
    >;
    const domain = getDomain(c as Context);
    const actor = typeof activity.actor === "string"
      ? activity.actor
      : `https://${domain}/users/${username}`;
    const db = createDB(env);
    if (validRecipients.length === 1 && typeof obj.content === "string") {
      await db.createDMMessage(
        actor,
        validRecipients[0],
        obj.content,
      );
      sendToUser(`${username}@${domain}`, {
        type: "hasUpdate",
        payload: { kind: "dm" },
      });
      return;
    }
    await saveObject(env, obj, actor);
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
};
