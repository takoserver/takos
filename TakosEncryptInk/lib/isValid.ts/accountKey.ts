import type {
  AccountKeyPrivateObject,
  AccountKeyPublicObject,
} from "../../types/keys.ts";
import { base64ToArrayBuffer } from "../../utils/buffers.ts";

export function isValidAccountPublicKey(
  key: string,
): boolean {
  const keyObject: AccountKeyPublicObject = JSON.parse(key);
  if (keyObject.type !== "AccountKeyPublic") return false;
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  if (keyRaw.length !== 1184) return false;
  return true;
}

export function isValidAccountPrivateKey(
  key: string,
): boolean {
  const keyObject: AccountKeyPrivateObject = JSON.parse(key);
  if (keyObject.type !== "AccountKeyPrivate") return false;
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key));
  if (keyRaw.length !== 4032) return false;
  return true;
}
