import {
  decodeBase64 as b64decode,
  encodeBase64 as b64encode,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import Fasp from "../models/takos/fasp.ts";

interface FaspDoc {
  baseUrl: string;
  serverId: string;
  faspPublicKey: string;
  privateKey: string;
  capabilities: Array<
    { identifier: string; version: string; enabled: boolean }
  >;
  communications: Array<unknown>;
}

interface AnnouncementSource {
  subscription?: { id: string };
  backfillRequest?: { id: string };
}

function hasCapability(fasp: FaspDoc, id: string) {
  return fasp.capabilities.some((c) => c.identifier === id && c.enabled);
}

async function signedFetch(
  fasp: FaspDoc,
  path: string,
  method: string,
  body?: unknown,
) {
  const url = new URL(path, fasp.baseUrl);
  const rawBody = body
    ? new TextEncoder().encode(JSON.stringify(body))
    : new Uint8Array();
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", rawBody),
  );
  const digestB64 = b64encode(digest);
  const digestHeader = `sha-256=:${digestB64}:`;
  const created = Math.floor(Date.now() / 1000);
  const lines = [
    `"@method": ${method.toLowerCase()}`,
    `"@target-uri": ${url.toString()}`,
    `"content-digest": ${digestHeader}`,
  ];
  const paramStr = '"@method" "@target-uri" "content-digest"';
  lines.push(
    `"@signature-params": (${paramStr});created=${created};keyid="${fasp.serverId}"`,
  );
  const base = new TextEncoder().encode(lines.join("\n"));
  const privateKeyBytes = b64decode(fasp.privateKey);
  const key = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("Ed25519", key, base),
  );
  const signature = `sig1=:${b64encode(sig)}:`;
  const sigInput =
    `sig1=(${paramStr});created=${created};keyid="${fasp.serverId}"`;
  const headers: Record<string, string> = {
    "content-digest": digestHeader,
    "signature-input": sigInput,
    signature,
  };
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const resBody = new Uint8Array(await res.clone().arrayBuffer());
  const resDigest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", resBody),
  );
  const resDigestB64 = b64encode(resDigest);
  const digestHeaderRes = res.headers.get("content-digest") ?? "";
  const digestVerified = digestHeaderRes === `sha-256=:${resDigestB64}:`;
  const sigInputHeader = res.headers.get("signature-input") ?? "";
  const sigHeader = res.headers.get("signature") ?? "";
  let verified = false;
  const inputMatch = sigInputHeader.match(
    /^sig1=\(([^)]+)\);created=(\d+);keyid="([^"]+)"/,
  );
  const sigMatch = sigHeader.match(/^sig1=:([^:]+):/);
  if (inputMatch && sigMatch) {
    const [, paramStr2, created2, keyId] = inputMatch;
    const components = paramStr2.split(" ");
    const lines2: string[] = [];
    for (const comp of components) {
      if (comp === '"@status"') {
        lines2.push(`"@status": ${res.status}`);
      } else if (comp === '"content-digest"') {
        lines2.push(`"content-digest": ${digestHeaderRes}`);
      }
    }
    lines2.push(
      `"@signature-params": (${paramStr2});created=${created2};keyid="${keyId}"`,
    );
    const base = new TextEncoder().encode(lines2.join("\n"));
    const publicKeyBytes = b64decode(fasp.faspPublicKey);
    const verifyKey = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const sigBytes = b64decode(sigMatch[1]);
    verified = await crypto.subtle.verify(
      "Ed25519",
      verifyKey,
      sigBytes,
      base,
    );
  }
  fasp.communications.push({
    direction: "out",
    endpoint: url.pathname,
    payload: {
      request: body ?? null,
      status: res.status,
      signatureVerified: verified,
      digestVerified,
    },
  });
  await fasp.save();
  if (!verified || !digestVerified) {
    throw new Error("応答検証に失敗しました");
  }
  return res;
}

export async function accountSearch(
  term: string | undefined,
  limit = 20,
  next?: string,
) {
  const fasp = await Fasp.findOne({ accepted: true }) as unknown as
    | FaspDoc
    | null;
  if (!fasp || !hasCapability(fasp, "account_search")) {
    return { results: [], next: undefined };
  }
  let path: string;
  if (next) {
    path = `/account_search/v0/search?next=${encodeURIComponent(next)}`;
  } else if (term) {
    path = `/account_search/v0/search?term=${
      encodeURIComponent(term)
    }&limit=${limit}`;
  } else {
    return { results: [], next: undefined };
  }
  const res = await signedFetch(fasp, path, "GET");
  if (!res.ok) return { results: [], next: undefined };
  const results = await res.json();
  let nextToken: string | undefined;
  const link = res.headers.get("link");
  if (link) {
    for (const part of link.split(",")) {
      const section = part.trim();
      const urlMatch = section.match(/<([^>]+)>/);
      if (!urlMatch) continue;
      const paramsPart = section.slice(urlMatch[0].length);
      for (const p of paramsPart.split(";")) {
        const [k, v] = p.trim().split("=");
        if (k === "rel" && v?.replace(/"/g, "") === "next") {
          try {
            const url = new URL(urlMatch[1]);
            nextToken = url.searchParams.get("next") ?? undefined;
          } catch {
            // ignore invalid URL
          }
        }
      }
    }
  }
  return { results, next: nextToken };
}

export async function fetchTrends(
  type: "content" | "hashtags" | "links",
  params: Record<string, string>,
) {
  const fasp = await Fasp.findOne({ accepted: true }) as unknown as
    | FaspDoc
    | null;
  if (!fasp || !hasCapability(fasp, "trends")) return [];
  const query = new URLSearchParams(params).toString();
  const path = `/trends/v0/${type}${query ? `?${query}` : ""}`;
  const res = await signedFetch(fasp, path, "GET");
  if (!res.ok) return [];
  return await res.json();
}

export async function sendAnnouncement(
  source: AnnouncementSource,
  category: "content" | "account",
  eventType: "new" | "update" | "delete" | "trending" | undefined,
  objectUris: string[],
  moreObjectsAvailable?: boolean,
) {
  const fasp = await Fasp.findOne({ accepted: true }) as unknown as
    | FaspDoc
    | null;
  if (!fasp || !hasCapability(fasp, "data_sharing")) return false;
  const body: Record<string, unknown> = { source, category, objectUris };
  if (eventType) body.eventType = eventType;
  if (typeof moreObjectsAvailable === "boolean") {
    body.moreObjectsAvailable = moreObjectsAvailable;
  }
  const res = await signedFetch(
    fasp,
    "/data_sharing/v0/announcements",
    "POST",
    body,
  );
  return res.ok;
}
