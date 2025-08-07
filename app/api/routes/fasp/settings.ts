import { Hono } from "hono";
import {
  decodeBase64,
  encodeBase64,
} from "https://deno.land/std@0.224.0/encoding/base64.ts";
import Fasp from "../../models/takos/fasp.ts";
import authRequired from "../../utils/auth.ts";

const app = new Hono();
app.use("/fasp", authRequired);
app.use("/fasp/*", authRequired);

app.get("/fasp", async (c) => {
  const fasps = await Fasp.find().lean();
  return c.json({ fasps });
});

app.post("/fasp", async (c) => {
  const body = await c.req.json();
  const { name, baseUrl, serverId, publicKey } = body;
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
  const myPublic = encodeBase64(pub);
  const myPrivate = encodeBase64(priv);
  const id = crypto.randomUUID();
  const fasp = await Fasp.create({
    _id: id,
    name,
    baseUrl,
    serverId,
    faspPublicKey: publicKey,
    publicKey: myPublic,
    privateKey: myPrivate,
    accepted: false,
  });
  fasp.communications.push({
    direction: "in",
    endpoint: c.req.path,
    payload: body,
  });
  await fasp.save();
  return c.json({ id, publicKey: myPublic }, 201);
});

app.post("/fasp/:id/accept", async (c) => {
  const id = c.req.param("id");
  const fasp = await Fasp.findById(id);
  if (!fasp) return c.json({ error: "not found" }, 404);
  fasp.accepted = true;
  const pub = decodeBase64(fasp.faspPublicKey);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", pub));
  const fingerprint = encodeBase64(hash);
  await fasp.save();
  return c.json({ fingerprint });
});

app.delete("/fasp/:id", async (c) => {
  const id = c.req.param("id");
  await Fasp.findByIdAndDelete(id);
  return c.json({ ok: true });
});

export default app;
