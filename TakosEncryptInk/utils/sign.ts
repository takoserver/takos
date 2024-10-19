import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import type { IdentityKey, IdentityKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type { MasterKey, MasterKeyPub, migrateDataSignKeyPub } from "../types/masterKey.ts"
import type { Sign } from "../types/sign.ts"
import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffers.ts"
import type { KeyShareSignKey, migrateDataSignKey } from "../types.ts"
import type { KeyShareSignKeyPub } from "../types/keyShareKey.ts"

export function sign(
    key: MasterKey | IdentityKey | KeyShareSignKey | migrateDataSignKey,
    data: ArrayBuffer,
  ): Sign {
    const keySeacretKey = new Uint8Array(base64ToArrayBuffer(key.private.key))
    const sign = ml_dsa65.sign(keySeacretKey, new Uint8Array(data))
    return {
      signature: arrayBufferToBase64(sign),
      hashedPublicKeyHex: key.hashHex,
      version: 1,
    }
}

export function verify(
    key: IdentityKeyPub | MasterKeyPub | KeyShareSignKeyPub | migrateDataSignKeyPub,
    data: ArrayBuffer,
    sign: Sign,
  ): boolean {
    const keyPublic = new Uint8Array(base64ToArrayBuffer(key.key))
    const signature = new Uint8Array(base64ToArrayBuffer(sign.signature))
    const isValid = ml_dsa65.verify(keyPublic, new Uint8Array(data), signature)
    return isValid
}