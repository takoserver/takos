import { arrayBufferToBase64 } from "../../utils/buffers.ts";

export async function generateDeviceKey(): Promise<string> {
  //aes-256-gcm
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const keyExport = await crypto.subtle.exportKey("raw", key);
  return JSON.stringify({
    key: arrayBufferToBase64(keyExport),
    type: "deviceKey",
    version: 1,
  });
}
