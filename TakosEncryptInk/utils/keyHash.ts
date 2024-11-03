import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffers.ts";

export async function keyHash(key: string): Promise<string> {
  const keyBinary = base64ToArrayBuffer(key);
  const keyHash = await crypto.subtle.digest("SHA-256", keyBinary);
  return arrayBufferToBase64(keyHash);
}
