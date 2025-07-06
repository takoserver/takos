import Account from "../models/account.ts";
import { env } from "./env.ts";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return base64ToArrayBuffer(b64);
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function signRequest(
  url: string,
  method: string,
  body: string,
  account: { userName: string; privateKey: string },
): Promise<Headers> {
  const headers = new Headers();
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const date = new Date().toUTCString();
  const encoder = new TextEncoder();

  // Content-Lengthヘッダーを追加
  const bodyBytes = encoder.encode(body);
  const contentLength = bodyBytes.length.toString();

  const digestValue = arrayBufferToBase64(
    await crypto.subtle.digest("SHA-256", bodyBytes),
  );
  const digest = `SHA-256=${digestValue}`;

  // 必要なヘッダーをセット
  headers.set("host", host);
  headers.set("date", date);
  headers.set("digest", digest);
  headers.set("content-type", "application/activity+json");
  headers.set("content-length", contentLength);
  headers.set("user-agent", "Takos/1.0 (ActivityPub)");

  // request-targetの正確な構築（パスとクエリを含む）
  const requestTarget =
    `${method.toLowerCase()} ${parsedUrl.pathname}${parsedUrl.search}`;

  // 署名文字列の構築（ヘッダーの順序が重要）
  const signingString = `(request-target): ${requestTarget}\n` +
    `host: ${host}\n` +
    `date: ${date}\n` +
    `digest: ${digest}\n` +
    `content-type: application/activity+json\n` +
    `content-length: ${contentLength}`;

  // 秘密鍵の正規化
  const normalizedPrivateKey = ensurePem(account.privateKey, "PRIVATE KEY");
  const keyData = pemToArrayBuffer(normalizedPrivateKey);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(signingString),
  );

  const signatureB64 = arrayBufferToBase64(signature);
  const domain = env["ACTIVITYPUB_DOMAIN"] || "localhost";
  const keyId = `https://${domain}/users/${account.userName}#main-key`;

  // 署名ヘッダーの構築（ヘッダーリストの順序を保持）
  headers.set(
    "signature",
    `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest content-type content-length",signature="${signatureB64}"`,
  );

  return headers;
}

export async function sendActivityPubObject(
  inboxUrl: string,
  object: unknown,
  actor: string,
): Promise<Response> {
  const body = JSON.stringify(object);
  const account = await Account.findOne({ userName: actor }).lean();
  if (!account) throw new Error("actor not found");
  const headers = await signRequest(inboxUrl, "POST", body, {
    userName: actor,
    privateKey: account.privateKey,
  });

  try {
    return await fetch(inboxUrl, {
      method: "POST",
      headers,
      body,
    });
  } catch (err) {
    console.error(`Failed to send ActivityPub object to ${inboxUrl}:`, err);
    throw err;
  }
}

export async function deliverActivityPubObject(
  inboxes: string[],
  object: unknown,
  actor: string,
): Promise<void> {
  for (const inbox of inboxes) {
    if (inbox.startsWith("http")) {
      try {
        await sendActivityPubObject(inbox, object, actor);
      } catch (_) {
        /* ignore individual errors */
      }
    }
  }
}

export function ensurePem(
  key: string,
  type: "PUBLIC KEY" | "PRIVATE KEY",
): string {
  if (key.includes("BEGIN")) return key;
  const lines = key.match(/.{1,64}/g)?.join("\n") ?? key;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

function parseSignatureHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of header.split(",")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const k = part.slice(0, eqIndex).trim();
    const v = part.slice(eqIndex + 1).trim();
    params[k] = v.replace(/^"|"$/g, "");
  }
  return params;
}

export async function verifyHttpSignature(
  req: Request,
  body: string,
): Promise<boolean> {
  try {
    const signatureHeader = req.headers.get("signature");
    if (!signatureHeader) {
      return false;
    }

    const params = parseSignatureHeader(signatureHeader);
    const publicKeyUrl = params.keyId;

    if (!publicKeyUrl) {
      return false;
    }

    let publicKeyPem = "";
    try {
      const res = await fetch(publicKeyUrl, {
        headers: {
          accept: "application/activity+json, application/ld+json",
          "user-agent": "Takos/1.0 (ActivityPub)",
        },
      });

      if (res.ok) {
        const data = await res.json();
        // より堅牢な公開鍵の取得
        publicKeyPem = data.publicKey?.publicKeyPem ??
          data.publicKeyPem ??
          "";
      } else {
        return false;
      }
    } catch (_error) {
      return false;
    }

    if (!publicKeyPem) {
      return false;
    }

    // Digestの検証
    const digestHeader = req.headers.get("digest");
    if (digestHeader) {
      const encoder = new TextEncoder();
      const expectedDigest = arrayBufferToBase64(
        await crypto.subtle.digest("SHA-256", encoder.encode(body)),
      );
      if (digestHeader !== `SHA-256=${expectedDigest}`) {
        return false;
      }
    }

    const headersList = params.headers.split(" ");
    const url = new URL(req.url);
    const lines: string[] = [];

    for (const h of headersList) {
      let value: string | null = null;
      if (h === "(request-target)") {
        // request-targetにクエリパラメータも含める
        value = `${req.method.toLowerCase()} ${url.pathname}${url.search}`;
      } else if (h === "host") {
        // リバースプロキシ環境では x-forwarded-host を優先
        value = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      } else if (h === "content-length") {
        // Content-Lengthは実際のボディの長さを使用
        const encoder = new TextEncoder();
        value = encoder.encode(body).length.toString();
      } else {
        value = req.headers.get(h);
      }
      if (value === null) {
        return false;
      }
      lines.push(`${h}: ${value}`);
    }

    const signingString = lines.join("\n");

    // 公開鍵の正規化（すでにPEM形式の場合はそのまま使用）
    const normalizedPublicKey = publicKeyPem.includes("BEGIN PUBLIC KEY")
      ? publicKeyPem
      : ensurePem(publicKeyPem, "PUBLIC KEY");

    const encoder = new TextEncoder();
    const keyData = pemToArrayBuffer(normalizedPublicKey);

    const key = await crypto.subtle.importKey(
      "spki",
      keyData,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signatureBytes = base64ToArrayBuffer(params.signature);
    const signingStringBytes = encoder.encode(signingString);

    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signatureBytes,
      signingStringBytes,
    );
    return verified;
  } catch (error) {
    console.error("Error in verifyHttpSignature:", error);
    return false;
  }
}

export function createFollowActivity(
  domain: string,
  actor: string,
  target: string,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: "Follow",
    actor,
    object: target,
  };
}

export function createUndoFollowActivity(
  domain: string,
  actor: string,
  target: string,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: "Undo",
    actor,
    object: {
      type: "Follow",
      actor,
      object: target,
    },
  };
}

export function createAcceptActivity(
  domain: string,
  actor: string,
  object: unknown,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: "Accept",
    actor,
    object,
  };
}

// Like Activity を生成
export function createLikeActivity(
  domain: string,
  actor: string,
  object: string,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: "Like",
    actor,
    object,
  };
}

// Undo Like Activity を生成
export function createUndoLikeActivity(
  domain: string,
  actor: string,
  object: string,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${domain}/activities/${crypto.randomUUID()}`,
    type: "Undo",
    actor,
    object: {
      type: "Like",
      actor,
      object,
    },
  };
}

export async function fetchActorInbox(
  actorUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(actorUrl, {
      headers: { accept: "application/activity+json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.inbox === "string") return data.inbox;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export interface ActivityPubActor {
  id: string;
  preferredUsername?: string;
  name?: string;
  icon?: { url?: string };
}

export async function resolveActor(
  username: string,
  domain: string,
): Promise<ActivityPubActor | null> {
  try {
    const resource = `acct:${username}@${domain}`;
    const url = `https://${domain}/.well-known/webfinger?resource=${
      encodeURIComponent(resource)
    }`;
    const wfRes = await fetch(url, {
      headers: {
        Accept: "application/jrd+json, application/json",
      },
    });
    if (!wfRes.ok) return null;
    const jrd = await wfRes.json();
    const selfLink = jrd.links?.find((l: { rel?: string; type?: string }) =>
      l.rel === "self" && l.type === "application/activity+json"
    );
    if (!selfLink?.href) return null;
    const actorRes = await fetch(selfLink.href, {
      headers: { Accept: "application/activity+json" },
    });
    if (!actorRes.ok) return null;
    return await actorRes.json();
  } catch {
    /* ignore */
    return null;
  }
}

export function getDomain(c: { req: { url: string } }): string {
  return env["ACTIVITYPUB_DOMAIN"] ?? new URL(c.req.url).host;
}

export function jsonResponse(
  // deno-lint-ignore no-explicit-any
  c: any,
  // deno-lint-ignore no-explicit-any
  data: any,
  status = 200,
  contentType = "application/json",
) {
  return c.body(JSON.stringify(data), status, {
    "content-type": contentType,
  });
}

export function createActor(
  domain: string,
  account: { userName: string; displayName: string; publicKey: string },
) {
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: `https://${domain}/users/${account.userName}`,
    type: "Person",
    preferredUsername: account.userName,
    name: account.displayName,
    summary: account.displayName,
    url: `https://${domain}/@${account.userName}`,
    icon: {
      type: "Image",
      mediaType: "image/png",
      url: `https://${domain}/users/${account.userName}/avatar`,
    },
    inbox: `https://${domain}/users/${account.userName}/inbox`,
    outbox: `https://${domain}/users/${account.userName}/outbox`,
    followers: `https://${domain}/users/${account.userName}/followers`,
    following: `https://${domain}/users/${account.userName}/following`,
    publicKey: {
      id: `https://${domain}/users/${account.userName}#main-key`,
      owner: `https://${domain}/users/${account.userName}`,
      publicKeyPem: ensurePem(account.publicKey, "PUBLIC KEY"),
    },
  };
}

export function buildActivityFromStored(
  obj: {
    _id: unknown;
    type: string;
    content: string;
    published: unknown;
    extra: Record<string, unknown>;
  },
  domain: string,
  username: string,
  withContext = false,
) {
  const base = {
    id: `https://${domain}/objects/${obj._id}`,
    type: obj.type,
    attributedTo: `https://${domain}/users/${username}`,
    content: obj.content,
    published: obj.published instanceof Date
      ? obj.published.toISOString()
      : obj.published,
    ...obj.extra,
  };
  return withContext
    ? { "@context": "https://www.w3.org/ns/activitystreams", ...base }
    : base;
}

// ---- 将来の機能向けユーティリティ ----

/** ActivityPub 用の ID を生成する */
export function createActivityId(domain: string, path = "activities") {
  return `https://${domain}/${path}/${crypto.randomUUID()}`;
}

/** オブジェクト ID を生成する */
export function createObjectId(domain: string, path = "objects") {
  return `https://${domain}/${path}/${crypto.randomUUID()}`;
}

/** Add Activity を生成する */
export function createAddActivity(
  domain: string,
  actor: string,
  object: unknown,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: createActivityId(domain),
    type: "Add",
    actor,
    object,
  };
}

/** Remove Activity を生成する */
export function createRemoveActivity(
  domain: string,
  actor: string,
  object: unknown,
) {
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: createActivityId(domain),
    type: "Remove",
    actor,
    object,
  };
}
