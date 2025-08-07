import { Hono } from "hono";
import { z } from "zod";
import {
  decode as b64decode,
  encode as b64encode,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import Fasp from "../../models/takos/fasp.ts";
import { getEnv } from "../../shared/config.ts";

const schema = z.object({
  name: z.string(),
  baseUrl: z.string().url(),
  serverId: z.string(),
  publicKey: z.string(),
});

const app = new Hono();

app.post("/fasp/registration", async (c) => {
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

  const bodyText = new TextDecoder().decode(rawBody);
  let data;
  try {
    data = schema.parse(JSON.parse(bodyText));
  } catch {
    return c.json({ error: "Invalid body" }, 400);
  }
  if (keyId !== data.serverId) {
    return c.json({ error: "Invalid keyid" }, 401);
  }

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
  const paramStr = components.map((c) => `"${c}"`).join(" ");
  lines.push(
    `"@signature-params": (${paramStr});created=${created};keyid="${keyId}"`,
  );
  const base = new TextEncoder().encode(lines.join("\n"));

  const signatureBytes = b64decode(sigMatch[1]);
  const publicKeyBytes = b64decode(data.publicKey);
  const key = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    {
      name: "Ed25519",
    },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("Ed25519", key, signatureBytes, base);
  if (!ok) {
    return c.json({ error: "Invalid Signature" }, 401);
  }

  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  const publicExport = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  const privateExport = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  );
  const myPublic = b64encode(publicExport);
  const myPrivate = b64encode(privateExport);

  const faspId = crypto.randomUUID();
  const fasp = await Fasp.create({
    _id: faspId,
    name: data.name,
    baseUrl: data.baseUrl,
    serverId: data.serverId,
    faspPublicKey: data.publicKey,
    publicKey: myPublic,
    privateKey: myPrivate,
    accepted: false,
  });

  fasp.communications.push({
    direction: "in",
    endpoint: c.req.path,
    payload: data,
  });
  await fasp.save();

  const env = getEnv(c);
  const domain = env["ROOT_DOMAIN"] ?? "";
  const registrationCompletionUri = domain
    ? `https://${domain}/admin/fasps`
    : "";

  return c.json({
    faspId,
    publicKey: myPublic,
    registrationCompletionUri,
  }, 201);
});

export default app;
