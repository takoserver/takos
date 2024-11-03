import type { EncryptedDataRoomKeyObject } from "../../types/EncryptedData.ts";
import { roomKeyObject } from "../../types/keys.ts";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../../utils/buffers.ts";
import { keyHash } from "../../utils/keyHash.ts";
import { isValidRoomKey } from "../isValid.ts/roomKey.ts";

export async function encryptDataRoomKey(
  data: string,
  keyString: string,
): Promise<EncryptedDataRoomKeyObject> {
  const key = JSON.parse(keyString);
  const keyRaw = new Uint8Array(base64ToArrayBuffer(key.key));
  if (!isValidRoomKey(keyString)) throw new Error("Invalid key");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyCrypto = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    "AES-GCM",
    true,
    ["encrypt"],
  );
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    keyCrypto,
    new TextEncoder().encode(data),
  );
  const encryptedDataRoomKey: EncryptedDataRoomKeyObject = {
    encryptedData: arrayBufferToBase64(encryptedData),
    vi: arrayBufferToBase64(iv),
    encryptedKeyHash: await keyHash(key.key),
    type: "roomKey",
    version: 1,
  };
  return encryptedDataRoomKey;
}

export async function decryptDataRoomKey(
  data: EncryptedDataRoomKeyObject,
  keyString: string,
): Promise<string> {
  const key: roomKeyObject = JSON.parse(keyString);
  if (!isValidRoomKey(keyString)) throw new Error("Invalid key");
  const keyRaw = new Uint8Array(base64ToArrayBuffer(key.key));
  const keyCrypto = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    "AES-GCM",
    true,
    ["decrypt"],
  );
  const encryptedDataRoomKey: EncryptedDataRoomKeyObject = data;
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(encryptedDataRoomKey.vi),
    },
    keyCrypto,
    base64ToArrayBuffer(encryptedDataRoomKey.encryptedData),
  );
  return new TextDecoder().decode(decryptedData);
}
