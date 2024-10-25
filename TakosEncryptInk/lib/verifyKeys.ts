import type { deviceKey } from "../types/deviceKey.ts"
import type { AccountKeyPub, IdentityKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type { KeyShareKeyPub, KeyShareSignKeyPub } from "../types/keyShareKey.ts"
import type { MasterKeyPub, migrateDataSignKeyPub } from "../types/masterKey.ts"
import type { migrateKeyPub } from "../types/migrateKey.ts"
import type { RoomKey } from "../types/roomKey.ts"
//@ts-ignore
import type { Sign } from "../types/sign.ts"
import { base64ToArrayBuffer } from "../utils/buffers.ts"
import { concatenateUint8Arrays } from "../utils/connectBinary.ts"
import { sign, verify } from "../utils/sign.ts"

export default function verifyKeys(
  signedKey:
    | AccountKeyPub
    | IdentityKeyPub
    | migrateKeyPub
    | KeyShareSignKeyPub
    | migrateDataSignKeyPub
    | KeyShareKeyPub
    | deviceKey
    | RoomKey,
  signKey:
    | MasterKeyPub
    | IdentityKeyPub
    | KeyShareSignKeyPub
    | migrateDataSignKeyPub,
  signature: Sign,
  type: string,
) {
  // timestampがある鍵は、timestampを含めてけんしょうする
  if (type !== signedKey.keyType) {
    throw new Error("Key type is invalid")
  }
  //"deviceKey" | "accountPub" | "identityPub" | "migratePub" | "keyShareSignPub" | "migrateDataSignPub" | "keySharePub"
  //timestampを含むやつ: identityKey, keyShareKey, keyShareSignkey,
  if (
    signedKey.keyType === "identityPub" ||
    signedKey.keyType === "keyShareSignPub" ||
    signedKey.keyType === "keySharePub"
  ) {
    const timestamp = signedKey.timestamp
    const key = signedKey.key
    const keyBuffer = base64ToArrayBuffer(key)
    const timestampBuffer = new TextEncoder().encode(timestamp)
    const signedData = concatenateUint8Arrays([
      new Uint8Array(keyBuffer),
      timestampBuffer,
    ])
    if (verify(signKey, signedData, signature)) {
      return true
    }
    return false
  }
  if (signedKey.keyType === "roomKey") {
    const key = signedKey.key
    const timestamp = signedKey.timestamp
    const hashHexs = signedKey.masterKeysHashHex
    const Buffer = concatenateUint8Arrays([
      new Uint8Array(base64ToArrayBuffer(key)),
      new TextEncoder().encode(timestamp),
      new TextEncoder().encode(JSON.stringify(hashHexs)),
    ])
    if (verify(signKey, Buffer, signature)) {
      return true
    }
    return false
  }
  const key = signedKey.key
  const keyBuffer = new Uint8Array(base64ToArrayBuffer(key))
  if (verify(signKey, keyBuffer, signature)) {
    return true
  }
  return false
}
