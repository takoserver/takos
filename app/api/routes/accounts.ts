import { Hono } from "hono";
import { getDomain, jsonResponse } from "../utils/activitypub.ts";
import authRequired from "../utils/auth.ts";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import { generateKeyPair } from "../../shared/crypto.ts";
import type { AccountDoc } from "../../shared/types.ts";
import { b64ToBuf } from "../../shared/buffer.ts";
import { isUrl } from "../../shared/url.ts";
import { saveFile } from "../services/file.ts";
import Fasp from "../models/takos/fasp.ts";
import { sendAnnouncement } from "../services/fasp.ts";

function formatAccount(doc: AccountDoc) {
  return {
    id: String(doc._id),
    userName: doc.userName,
    displayName: doc.displayName,
    avatarInitial: doc.avatarInitial,
    publicKey: doc.publicKey,
    followers: doc.followers,
    following: doc.following,
    dms: doc.dms,
  };
}

// 画像データURLやURL文字列を処理して保存し、URLまたはイニシャルを返す
async function resolveAvatar(
  value: unknown,
  env: Record<string, string>,
  name: string,
): Promise<string> {
  if (typeof value === "string") {
    const trimmed = value.trim();
    // data URL の場合はファイルとして保存する
    if (trimmed.startsWith("data:image/")) {
      const match = trimmed.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        const [, type, data] = match;
        const bytes = b64ToBuf(data);
        const ext = type.split("/")[1]?.split("+")[0];
        const saved = await saveFile(bytes, env, {
          mediaType: type,
          ext: ext ? `.${ext}` : ".png",
        });
        return saved.url;
      }
    }
    // 既にURLで渡された場合はそのまま利用
    if (isUrl(trimmed) || trimmed.startsWith("/")) return trimmed;
  }
  // 画像が指定されない場合は表示名からイニシャルを生成
  return name.charAt(0).toUpperCase().substring(0, 2);
}

async function notifyFaspAccount(
  env: Record<string, string>,
  domain: string,
  username: string,
  eventType: "new" | "update" | "delete",
) {
  const db = createDB(env);
  const acc = await db.findAccountByUserName(username) as unknown as
    | { extra?: { discoverable?: boolean; visibility?: string } }
    | null;
  if (!acc) return;
  const isPublic = (acc.extra?.visibility ?? "public") === "public";
  const discoverable = Boolean(acc.extra?.discoverable);
  if (!isPublic || !discoverable) return;

  const fasp = await Fasp.findOne({ accepted: true }) as unknown as
    | {
      eventSubscriptions: {
        id: string;
        category: string;
        subscriptionType: string;
      }[];
    }
    | null;
  if (!fasp) return;
  const subs = (fasp.eventSubscriptions as {
    id: string;
    category: string;
    subscriptionType: string;
  }[]).filter((s) =>
    s.category === "account" && s.subscriptionType === "lifecycle"
  );
  const uri = `https://${domain}/users/${username}`;
  for (const sub of subs) {
    await sendAnnouncement(
      { subscription: { id: sub.id } },
      "account",
      eventType,
      [uri],
    );
  }
}

const app = new Hono();
app.use("/accounts/*", authRequired);

app.get("/accounts", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const list = await db.listAccounts();
  const formatted = list.map((doc) => formatAccount(doc));
  return jsonResponse(c, formatted);
});

app.post("/accounts", async (c) => {
  const domain = getDomain(c);
  const env = getEnv(c);
  const { username, displayName, icon, privateKey, publicKey } = await c.req
    .json();

  // userName is required and cannot be changed after creation
  if (!username || typeof username !== "string" || username.trim() === "") {
    return jsonResponse(c, {
      error: "Username is required and cannot be empty",
    }, 400);
  }

  if (username.trim() === "system") {
    return jsonResponse(c, { error: "このユーザー名は使用できません" }, 400);
  }

  // Check if username already exists
  const db = createDB(env);
  const existingAccount = await db.findAccountByUserName(username.trim());
  if (existingAccount) {
    return jsonResponse(c, { error: "Username already exists" }, 409);
  }

  const keys = privateKey && publicKey
    ? { privateKey, publicKey }
    : await generateKeyPair();
  const account = await db.createAccount({
    userName: username.trim(),
    displayName: displayName ?? username.trim(),
    avatarInitial: await resolveAvatar(
      icon,
      env,
      (displayName ?? username).trim(),
    ),
    privateKey: keys.privateKey,
    publicKey: keys.publicKey,
    followers: [],
    following: [],
    dms: [],
  });
  await notifyFaspAccount(env, domain, username.trim(), "new");
  return jsonResponse(c, formatAccount(account));
});

app.get("/accounts/:id", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const id = c.req.param("id");
  const account = await db.findAccountById(id);
  if (!account) return jsonResponse(c, { error: "Account not found" }, 404);
  return jsonResponse(c, {
    ...formatAccount(account),
    privateKey: account.privateKey,
  });
});

app.put("/accounts/:id", async (c) => {
  const domain = getDomain(c);
  const env = getEnv(c);
  const db = createDB(env);
  const id = c.req.param("id");
  const updates = await c.req.json();
  const orig = await db.findAccountById(id);
  if (!orig) return jsonResponse(c, { error: "Account not found" }, 404);

  const data: Record<string, unknown> = {};
  // userName is immutable after creation - removed from update logic
  if (updates.displayName) data.displayName = updates.displayName;
  if (updates.avatarInitial !== undefined) {
    const base = updates.displayName ?? orig.displayName ?? orig.userName;
    data.avatarInitial = await resolveAvatar(updates.avatarInitial, env, base);
  } else if (updates.displayName) {
    const cur = orig.avatarInitial;
    if (
      !cur ||
      (!cur.startsWith("data:image/") && !isUrl(cur) && !cur.startsWith("/"))
    ) {
      data.avatarInitial = updates.displayName.charAt(0).toUpperCase()
        .substring(0, 2);
    }
  }
  if (updates.privateKey) data.privateKey = updates.privateKey;
  if (updates.publicKey) data.publicKey = updates.publicKey;
  if (Array.isArray(updates.followers)) data.followers = updates.followers;
  if (Array.isArray(updates.following)) data.following = updates.following;
  if (Array.isArray(updates.dms)) data.dms = updates.dms;

  const account = await db.updateAccountById(id, data);
  if (!account) return jsonResponse(c, { error: "Account not found" }, 404);
  await notifyFaspAccount(env, domain, account.userName, "update");
  return jsonResponse(c, formatAccount(account));
});

app.delete("/accounts/:id", async (c) => {
  const domain = getDomain(c);
  const env = getEnv(c);
  const db = createDB(env);
  const id = c.req.param("id");
  const acc = await db.findAccountById(id);
  if (!acc) return jsonResponse(c, { error: "Account not found" }, 404);
  const deleted = await db.deleteAccountById(id);
  if (!deleted) return jsonResponse(c, { error: "Account not found" }, 404);
  await notifyFaspAccount(env, domain, acc.userName, "delete");
  return jsonResponse(c, { success: true });
});

export default app;
