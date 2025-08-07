import { Hono } from "hono";
import { encodeBase64 as b64encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import authRequired from "../../utils/auth.ts";
import Fasp from "../../models/takos/fasp.ts";
import { activateCapability, getProviderInfo } from "../../services/fasp.ts";

async function publicKeyFingerprint(pubKey: string): Promise<string> {
  const data = new TextEncoder().encode(pubKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const app = new Hono();
app.use("/admin/*", authRequired);

app.get("/admin/fasps", async (c) => {
  const fasps = await Fasp.find().lean();
  return c.json({ fasps });
});

app.post("/admin/fasps", async (c) => {
  const body = await c.req.json();
  const { name, baseUrl, serverId, publicKey } = body;
  if (!name || !baseUrl || !serverId || !publicKey) {
    return c.json({ error: "invalid body" }, 400);
  }
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]) as CryptoKeyPair;
  const pub = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  const priv = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  );
  const faspId = crypto.randomUUID();
  const fasp = await Fasp.create({
    _id: faspId,
    name,
    baseUrl,
    serverId,
    faspPublicKey: publicKey,
    publicKey: b64encode(pub),
    privateKey: b64encode(priv),
    accepted: false,
  });
  fasp.communications.push({
    direction: "in",
    endpoint: c.req.path,
    payload: { name, baseUrl, serverId, publicKey },
  });
  await fasp.save();
  return c.json({ ok: true, id: faspId }, 201);
});

app.get("/admin/fasps/provider_info", async (c) => {
  const info = await getProviderInfo();
  if (!info) return c.json({ error: "not found" }, 404);
  return c.json({ info });
});

app.post("/admin/fasps/:id/accept", async (c) => {
  const { id } = c.req.param();
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = true;
  await fasp.save();
  const fingerprint = await publicKeyFingerprint(fasp.faspPublicKey);
  return c.json({ ok: true, fingerprint });
});

app.delete("/admin/fasps/:id", async (c) => {
  const { id } = c.req.param();
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = false;
  await fasp.save();
  return c.json({ ok: true });
});

app.post(
  "/admin/fasps/capabilities/:id/:version/activation",
  async (c) => {
    const { id, version } = c.req.param();
    const ok = await activateCapability(id, version, true);
    return c.json({ ok });
  },
);

app.delete(
  "/admin/fasps/capabilities/:id/:version/activation",
  async (c) => {
    const { id, version } = c.req.param();
    const ok = await activateCapability(id, version, false);
    return c.json({ ok });
  },
);

export default app;
