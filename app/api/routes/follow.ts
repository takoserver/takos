import { type Context, Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import authRequired from "../utils/auth.ts";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import {
  createAcceptActivity,
  createFollowActivity,
  createUndoFollowActivity,
  deliverActivityPubObject,
  fetchActorInbox,
  getDomain,
  jsonResponse,
  resolveActorFromAcct,
} from "../utils/activitypub.ts";
import { addNotification } from "../services/notification.ts";
import type { AccountDoc } from "../../shared/types.ts";

async function resolveActorId(
  input: string,
  domain: string,
): Promise<string> {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  if (input.includes("@")) {
    const acct = input.startsWith("acct:") ? input.slice(5) : input;
    const actor = await resolveActorFromAcct(acct).catch(() => null);
    if (actor?.id) return actor.id;
    const [name, host] = acct.split("@");
    return `https://${host}/users/${name}`;
  }
  return `https://${domain}/users/${input}`;
}

const app = new Hono();
app.use("/follow", authRequired);

async function processFollow(c: Context, remove: boolean) {
  const { follower, target } = c.req.valid("json") as {
    follower: string;
    target: string;
  };
  const domain = getDomain(c);
  const env = getEnv(c);
  const db = createDB(env);

  const followerUrl = await resolveActorId(follower, domain);
  const targetUrl = await resolveActorId(target, domain);

  const followerInfo = new URL(followerUrl);
  const isLocalFollower = followerInfo.hostname === domain;
  let account: AccountDoc | null = null;
  if (isLocalFollower) {
    const followerName = followerInfo.pathname.split("/")[2];
    account = await db.findAccountByUserName(followerName);
    if (!account) {
      return jsonResponse(c, { error: "Follower not found" }, 404);
    }
  }

  const following = account
    ? (remove
      ? await db.removeFollowing(String(account._id), targetUrl)
      : await db.addFollowing(String(account._id), targetUrl))
    : [];

  try {
    const actorId = account
      ? `https://${domain}/users/${account.userName}`
      : followerUrl;
    const url = new URL(targetUrl);
    if (url.hostname === domain && url.pathname.startsWith("/users/")) {
      const name = url.pathname.split("/")[2];
      if (remove) {
        await db.removeFollowerByName(name, actorId);
      } else {
        await db.addFollowerByName(name, actorId);
      }
      if (account) {
        if (!remove) {
          await addNotification(
            "新しいフォロー",
            `${account.userName}さんが${name}さんをフォローしました`,
            "info",
            env,
          );
        }
      } else if (!remove) {
        const accept = createAcceptActivity(
          domain,
          `https://${domain}/users/${name}`,
          createFollowActivity(domain, actorId, targetUrl),
        );
        deliverActivityPubObject(
          [followerUrl],
          accept,
          name,
          domain,
          env,
        ).catch((err) => console.error("Delivery failed:", err));
      }
    } else if (account) {
      const inbox = await fetchActorInbox(targetUrl, env);
      if (inbox) {
        const activity = remove
          ? createUndoFollowActivity(domain, actorId, targetUrl)
          : createFollowActivity(domain, actorId, targetUrl);
        deliverActivityPubObject(
          [inbox],
          activity,
          account.userName,
          domain,
          env,
        ).catch((err) => console.error("Delivery failed:", err));
      }
      if (remove) {
        if (db.unfollow) await db.unfollow(account.userName, targetUrl);
      } else {
        await db.follow(account.userName, targetUrl);
      }
    } else {
      return jsonResponse(c, { error: "unsupported" }, 400);
    }
  } catch (err) {
    console.error("Follow operation failed:", err);
  }

  return jsonResponse(c, { following });
}

app.post(
  "/follow",
  zValidator("json", z.object({ follower: z.string(), target: z.string() })),
  (c) => processFollow(c, false),
);

app.delete(
  "/follow",
  zValidator("json", z.object({ follower: z.string(), target: z.string() })),
  (c) => processFollow(c, true),
);

export default app;
