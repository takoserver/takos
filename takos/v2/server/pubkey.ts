// books.ts
import { Hono } from "hono";
import ServerConfig from "../../models/serverConfig.ts";
import { generateKeyPair } from "@/utils/takosSign.ts";
const app = new Hono();

app.all("/", async (c) => {
  const serverConfig = await ServerConfig.findOne({ key: "publicKey" });
  if (serverConfig === null) {
    const keyPair = await generateKeyPair();
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey,
    );
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey,
    );
    await ServerConfig.create({
      key: "privateKey",
      value: JSON.stringify(privateKey),
    });
    await ServerConfig.create({
      key: "publicKey",
      value: JSON.stringify(publicKey),
    });
    return c.json({
      status: 200,
      pubkey: JSON.stringify(publicKey),
    });
  }
  return c.json({
    status: 200,
    pubkey: JSON.parse(serverConfig.value),
  });
});
export default app;
