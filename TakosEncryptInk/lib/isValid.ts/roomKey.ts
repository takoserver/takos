import type { roomKeyObject } from "../../types/keys.ts";
import { base64ToArrayBuffer } from "../../utils/buffers.ts";
export function isValidRoomKey(key: string): boolean {
  const keyObject: roomKeyObject = JSON.parse(key);
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  //key is aes-256-gcm
  if (keyRaw.length !== 32) return false;
  if (keyObject.timestamp !== new Date(keyObject.timestamp).toISOString()) {
    return false;
  }
  if (keyObject.type !== "roomKey") return false;
  for (const hash in keyObject.masterKeysHashHex) {
    const hashRaw = new Uint8Array(
      base64ToArrayBuffer(keyObject.masterKeysHashHex[hash]),
    );
    if (hashRaw.length !== 32) return false;
  }
  return true;
}
