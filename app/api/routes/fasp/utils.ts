import {
  decodeBase64 as b64decode,
  encodeBase64 as b64encode,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";

/**
 * レスポンスボディを署名し、必要なヘッダーを付与して返すヘルパー
 */
export async function signResponse(
  body: unknown,
  status: number,
  keyId: string,
  privateKeyB64: string,
): Promise<Response> {
  const json = body ? JSON.stringify(body) : "";
  const raw = new TextEncoder().encode(json);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", raw),
  );
  const digestB64 = b64encode(digest);
  const digestHeader = `sha-256=:${digestB64}:`;
  const created = Math.floor(Date.now() / 1000);
  const paramStr = '"@status" "content-digest"';
  const lines = [
    `"@status": ${status}`,
    `"content-digest": ${digestHeader}`,
    `"@signature-params": (${paramStr});created=${created};keyid="${keyId}"`,
  ];
  const base = new TextEncoder().encode(lines.join("\n"));
  const keyBytes = b64decode(privateKeyB64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("Ed25519", key, base),
  );
  const signature = `sig1=:${b64encode(sig)}:`;
  const sigInput = `sig1=(${paramStr});created=${created};keyid="${keyId}"`;
  const headers: Record<string, string> = {
    "content-digest": digestHeader,
    "signature-input": sigInput,
    signature,
  };
  if (body) headers["content-type"] = "application/json";
  return new Response(json || null, { status, headers });
}

export default signResponse;
