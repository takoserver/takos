import type {
  EncryptedDataAccountKey,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
} from "../types/EncryptedData.ts"
import type {
  AccountKey,
  AccountKeyPub,
  IdentityKey,
  IdentityKeyPub,
} from "../types/identityKeyAndAccountKey.ts"
import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils/buffers.ts"
import { hashHexKey } from "../utils/hashHexKey.ts"
import type { migrateDataSignKey } from "../types/masterKey.ts"
// deno-lint-ignore ban-ts-comment
//@ts-ignore
import type { Sign } from "../types/sign.ts"
import { sign, verify } from "../utils/sign.ts"
import type { migrateDataSignKeyPub, migrateKey, migrateKeyPub } from "../types/migrateKey.ts"
import type {
  KeyShareKey,
  KeyShareKeyPub,
  KeyShareSignKey,
  KeyShareSignKeyPub,
} from "../types/keyShareKey.ts"
import type { deviceKey } from "../types/deviceKey.ts"
import type { RoomKey } from "../types/roomKey.ts"

export async function encryptDataMlKems(
  data: string,
  pubKey: AccountKeyPub | migrateKeyPub | KeyShareKeyPub,
): Promise<EncryptedDataAccountKey> {
  const dataUint8Array = new TextEncoder().encode(data)
  const keys = ml_kem768.encapsulate(
    new Uint8Array(base64ToArrayBuffer(pubKey.key)),
  )
  const cipherText = keys.cipherText
  const sharedSecret = keys.sharedSecret
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    dataUint8Array,
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "accountKey",
    encryptedKeyHashHex: await hashHexKey(pubKey),
    cipherText: arrayBufferToBase64(cipherText),
    version: 1,
  }
}

export async function decryptDataMlKems(
  data: EncryptedDataAccountKey | EncryptedDataKeyShareKey,
  key: AccountKey | KeyShareKey | migrateKey,
): Promise<string> {
  const keyUint8Array = new Uint8Array(base64ToArrayBuffer(key.private.key))
  const sharedSecret = ml_kem768.decapsulate(
    new Uint8Array(base64ToArrayBuffer(data.cipherText)),
    keyUint8Array,
  )
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(data.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function encryptDataAESGCMs(
  data: string,
  key: deviceKey | RoomKey,
): Promise<EncryptedDataDeviceKey | EncryptedDataRoomKey> {
  const dataUint8Array = new TextEncoder().encode(data)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(base64ToArrayBuffer(key.key)),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    dataUint8Array,
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: key.keyType,
    encryptedKeyHashHex: await hashHexKey(key),
    version: 1,
  }
}

export async function decryptDataAESGCMs(
  data: EncryptedDataDeviceKey | EncryptedDataRoomKey,
  key: deviceKey | RoomKey,
): Promise<string> {
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(base64ToArrayBuffer(key.key)),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(data.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export function signEncryptedData(
  EncryptedData:
    | EncryptedDataAccountKey
    | EncryptedDataDeviceKey
    | EncryptedDataRoomKey
    | EncryptedDataKeyShareKey,
  Key: IdentityKey | KeyShareSignKey | migrateDataSignKey,
): Sign {
  const data = new Uint8Array(base64ToArrayBuffer(EncryptedData.encryptedData))
  return sign(Key, data)
}

export function verifyEncryptedData(
  EncryptedData:
    | EncryptedDataAccountKey
    | EncryptedDataDeviceKey
    | EncryptedDataRoomKey
    | EncryptedDataKeyShareKey,
  Key: IdentityKeyPub | KeyShareSignKeyPub | migrateDataSignKeyPub,
  signature: Sign,
): boolean {
  const data = new Uint8Array(base64ToArrayBuffer(EncryptedData.encryptedData))
  return verify(Key, data, signature)
}
