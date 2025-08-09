import { Hono } from "hono";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import HostFaspServer from "../../models/takos_host/fasp_server.ts";

const app = new Hono();

app.get("/fasp", (c) => c.json({ error: "not found" }, 404));

app.get("/fasp/provider_info", async (c) => {
  let conf = await HostFaspServer.findOne().lean<
    {
      serverId: string;
      publicKey: string;
      privateKey: string;
    } | null
  >();
  if (!conf) {
    const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
      "sign",
      "verify",
    ]) as CryptoKeyPair;
    const pub = new Uint8Array(
      await crypto.subtle.exportKey("raw", pair.publicKey),
    );
    const priv = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", pair.privateKey),
    );
    conf = {
      serverId: crypto.randomUUID(),
      publicKey: encodeBase64(pub),
      privateKey: encodeBase64(priv),
    };
    await HostFaspServer.create(conf);
  }
  return c.json({
    serverId: conf.serverId,
    publicKey: conf.publicKey,
    capabilities: [
      { identifier: "data_sharing", versions: ["v0"] },
      { identifier: "account_search", versions: ["v0"] },
      { identifier: "trends", versions: ["v0"] },
    ],
  });
});

export default app;
