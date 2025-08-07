import { Hono } from "hono";
import type { Context } from "hono";
import {
  decode as b64decode,
  encode as b64encode,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import Fasp from "../../models/takos/fasp.ts";

const app = new Hono();

async function handleActivation(c: Context, enabled: boolean) {
  const rawBody = new Uint8Array(await c.req.arrayBuffer());
  const digestHeader = c.req.header("content-digest") ?? "";
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", rawBody));
  const digestB64 = b64encode(digest);
  if (digestHeader !== `sha-256=:${digestB64}:`) {
    return c.json({ error: "Invalid Content-Digest" }, 401);
  }

  const sigInput = c.req.header("signature-input") ?? "";
  const signature = c.req.header("signature") ?? "";
  const sigInputMatch = sigInput.match(
    /^sig1=\(([^)]+)\);\s*created=(\d+);\s*keyid="([^"]+)"$/,
  );
  const sigMatch = signature.match(/^sig1=:([A-Za-z0-9+/=]+):$/);
  if (!sigInputMatch || !sigMatch) {
    return c.json({ error: "Invalid Signature" }, 401);
  }
  const components = sigInputMatch[1].split(" ").map((s) =>
    s.replace(/"/g, "")
  );
  const created = Number(sigInputMatch[2]);
  const keyId = sigInputMatch[3];

  const lines: string[] = [];
  for (const comp of components) {
    if (comp === "@method") {
      lines.push('"@method": ' + c.req.method.toLowerCase());
    } else if (comp === "@target-uri") {
      lines.push('"@target-uri": ' + c.req.url);
    } else if (comp === "content-digest") {
      lines.push('"content-digest": ' + digestHeader);
    }
  }
  const paramStr = components.map((p) => `"${p}"`).join(" ");
  lines.push(
    `"@signature-params": (${paramStr});created=${created};keyid="${keyId}"`,
  );
  const base = new TextEncoder().encode(lines.join("\n"));

  const signatureBytes = b64decode(sigMatch[1]);
  const fasp = await Fasp.findOne({ serverId: keyId });
  if (!fasp) {
    return c.json({ error: "Unknown FASP" }, 404);
  }
  const publicKeyBytes = b64decode(fasp.faspPublicKey);
  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "Ed25519" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("Ed25519", key, signatureBytes, base);
  if (!ok) {
    return c.json({ error: "Invalid Signature" }, 401);
  }

  const identifier = c.req.param("id");
  const version = c.req.param("version");
  const caps = fasp.capabilities as {
    identifier: string;
    version: string;
    enabled: boolean;
  }[];
  const idx = caps.findIndex((cap) =>
    cap.identifier === identifier && cap.version === version
  );
  if (idx === -1) {
    caps.push({ identifier, version, enabled });
  } else {
    caps[idx].enabled = enabled;
  }
  fasp.capabilities = caps;
  fasp.communications.push({
    direction: "in",
    endpoint: c.req.path,
    payload: { enabled },
  });
  await fasp.save();

  return c.body(null, 204);
}

app.post(
  "/fasp/capabilities/:id/:version/activation",
  (c) => handleActivation(c, true),
);
app.delete(
  "/fasp/capabilities/:id/:version/activation",
  (c) => handleActivation(c, false),
);

export default app;
