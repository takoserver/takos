import { b64ToBuf, bufToB64, strToBuf } from "./buffer.ts";

/**
 * Content-Digest ヘッダー値を生成する。SHA-256 を利用。
 * docs/fasp/general/v0.1/protocol_basics.md の "Request Integrity" に基づく。
 */
export async function createContentDigest(body: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", body);
  return `sha-256=:${bufToB64(hash)}:`;
}

/**
 * Content-Digest の検証。
 * body から計算した値とヘッダー値が一致するか確認する。
 */
export async function verifyContentDigest(
  body: Uint8Array,
  header: string,
): Promise<boolean> {
  const expected = await createContentDigest(body);
  return header.trim() === expected;
}

/**
 * HTTP Message Signature の署名を作成。
 * `@method`, `@target-uri`, `content-digest` をカバーする。
 * docs/fasp/general/v0.1/protocol_basics.md の "Authentication" を参照。
 */
export async function signRequest(
  opts: {
    method: string;
    url: string;
    body: Uint8Array;
    key: CryptoKey;
    keyId: string;
  },
): Promise<{
  "content-digest": string;
  "signature-input": string;
  signature: string;
}> {
  const contentDigest = await createContentDigest(opts.body);
  const created = Math.floor(Date.now() / 1000);
  const base =
    `"@method": ${opts.method.toLowerCase()}\n"@target-uri": ${opts.url}\ncontent-digest: ${contentDigest}`;
  const sig = await crypto.subtle.sign("Ed25519", opts.key, strToBuf(base));
  const b64 = bufToB64(sig);
  const signatureInput =
    `sig1=("@method" "@target-uri" "content-digest");created=${created};keyid="${opts.keyId}"`;
  const signature = `sig1=:${b64}:`;
  return {
    "content-digest": contentDigest,
    "signature-input": signatureInput,
    signature,
  };
}

/**
 * HTTP Message Signature の検証。
 */
export async function verifyRequest(
  opts: {
    method: string;
    url: string;
    body: Uint8Array;
    key: CryptoKey;
    signatureInput: string;
    signature: string;
  },
): Promise<boolean> {
  const contentDigest = await createContentDigest(opts.body);
  const base =
    `"@method": ${opts.method.toLowerCase()}\n"@target-uri": ${opts.url}\ncontent-digest: ${contentDigest}`;
  const match = opts.signature.match(/sig1=:(.+):/);
  if (!match) return false;
  const sig = b64ToBuf(match[1]);
  return await crypto.subtle.verify(
    "Ed25519",
    opts.key,
    sig,
    strToBuf(base),
  );
}

/**
 * Signature-Input から keyid を抽出。
 */
export function parseKeyId(header: string): string | null {
  const m = header.match(/keyid="([^"]+)"/);
  return m ? m[1] : null;
}

/**
 * draft-cavage HTTP Signatures 用の署名を生成。
 */
export async function signRequestLegacy(
  opts: {
    method: string;
    url: string;
    body: Uint8Array;
    key: CryptoKey;
    keyId: string;
  },
): Promise<{
  "content-digest": string;
  date: string;
  signature: string;
}> {
  const contentDigest = await createContentDigest(opts.body);
  const date = new Date().toUTCString();
  const u = new URL(opts.url);
  const path = u.pathname + u.search;
  const signingBase =
    `(request-target): ${opts.method.toLowerCase()} ${path}\nhost: ${u.host}\ndate: ${date}\ncontent-digest: ${contentDigest}`;
  const sig = await crypto.subtle.sign(
    "Ed25519",
    opts.key,
    strToBuf(signingBase),
  );
  const b64 = bufToB64(sig);
  const signature =
    `keyId="${opts.keyId}",algorithm="ed25519",headers="(request-target) host date content-digest",signature="${b64}"`;
  return { "content-digest": contentDigest, date, signature };
}

/**
 * RFC9421 を優先し、401/403 なら draft-cavage で再試行するフェッチ処理。
 * docs/FASP.md 3章のダブルノッキング要件を実装。
 */
const sigCache = new Map<
  string,
  { scheme: "9421" | "cavage"; expires: number }
>();
const CACHE_TTL = 60 * 60 * 1000; // 1時間

export async function signedFetch(
  opts: {
    method: string;
    url: string;
    key: CryptoKey;
    keyId: string;
    body?: Uint8Array;
    headers?: HeadersInit;
  },
): Promise<Response> {
  const body = opts.body ?? new Uint8Array();
  const u = new URL(opts.url);
  const cache = sigCache.get(u.host);
  const now = Date.now();

  const send9421 = async () => {
    const h = new Headers(opts.headers);
    const sig = await signRequest({
      method: opts.method,
      url: opts.url,
      body,
      key: opts.key,
      keyId: opts.keyId,
    });
    h.set("content-digest", sig["content-digest"]);
    h.set("signature-input", sig["signature-input"]);
    h.set("signature", sig.signature);
    return await fetch(opts.url, { method: opts.method, headers: h, body });
  };

  const sendCavage = async () => {
    const h = new Headers(opts.headers);
    const sig = await signRequestLegacy({
      method: opts.method,
      url: opts.url,
      body,
      key: opts.key,
      keyId: opts.keyId,
    });
    h.set("content-digest", sig["content-digest"]);
    h.set("date", sig.date);
    h.set("signature", sig.signature);
    return await fetch(opts.url, { method: opts.method, headers: h, body });
  };

  // キャッシュされた方式があればそれを試行
  if (cache && cache.expires > now) {
    const res = cache.scheme === "9421" ? await send9421() : await sendCavage();
    if (res.status === 401 || res.status === 403) {
      sigCache.delete(u.host);
      return cache.scheme === "9421" ? await sendCavage() : await send9421();
    }
    return res;
  }

  // デフォルトは RFC9421 で送信
  const res = await send9421();
  if (res.status === 401 || res.status === 403) {
    const res2 = await sendCavage();
    if (res2.ok) {
      sigCache.set(u.host, { scheme: "cavage", expires: now + CACHE_TTL });
    }
    return res2;
  }
  if (res.ok) {
    sigCache.set(u.host, { scheme: "9421", expires: now + CACHE_TTL });
  }
  return res;
}
