//export function
import { ArrayBuffertoBase64, base64ToArrayBuffer } from "../base.ts";

export async function enscriptDeviceKey(
  data: string,
  publicKey: CryptoKey,
): Promise<string> {
  const result = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    new TextEncoder().encode(data),
  );
  return ArrayBuffertoBase64(result);
}

export async function decriptDeviceKey(
  data: string,
  privateKey: CryptoKey,
): Promise<string> {
  const result = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    base64ToArrayBuffer(data),
  );
  return new TextDecoder().decode(result);
}
