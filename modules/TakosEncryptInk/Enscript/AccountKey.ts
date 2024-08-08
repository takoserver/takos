import { ArrayBuffertoBase64, base64ToArrayBuffer } from "../base.ts";

async function signAccountKey(
  data: string,
  privateKey: CryptoKey,
): Promise<string> {
  const result = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    new TextEncoder().encode(data),
  );
  return ArrayBuffertoBase64(result);
}

async function verifyAccountKey(
  data: string,
  publicKey: CryptoKey,
  signature: string,
): Promise<boolean> {
  const result = await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    base64ToArrayBuffer(signature),
    new TextEncoder().encode(data),
  );
  return result;
}

export { signAccountKey, verifyAccountKey };
