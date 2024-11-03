import type { deviceKeyObject } from "../../types/keys.ts";
import { base64ToArrayBuffer } from "../../utils/buffers.ts";
export function isValidDeviceKey(key: string): boolean {
  const keyObject: deviceKeyObject = JSON.parse(key);
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  //key is aes-256-gcm
  if (keyRaw.length !== 32) return false;
  if (keyObject.type !== "deviceKey") return false;
  return true;
}
