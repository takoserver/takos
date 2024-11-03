import type {
  IdentityKeyPrivateObject,
  IdentityKeyPublicObject,
} from "../../types/keys.ts";
import { base64ToArrayBuffer } from "../../utils/buffers.ts";

export function isValidIdentityPublicKey(
  key: string,
): boolean {
  const keyObject: IdentityKeyPublicObject = JSON.parse(key);
  if (keyObject.type !== "IdentityKeyPublic") return false;
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  if (keyRaw.length !== 1952) return false;
  if (keyObject.timestamp !== new Date(keyObject.timestamp).toISOString()) {
    return false;
  }
  return true;
}

export function isValidIdentityPrivateKey(
  key: string,
): boolean {
  const keyObject: IdentityKeyPrivateObject = JSON.parse(key);
  if (keyObject.type !== "IdentityKeyPrivate") return false;
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  if (keyRaw.length !== 4032) return false;
  if (keyObject.timestamp !== new Date(keyObject.timestamp).toISOString()) {
    return false;
  }
  return true;
}
