import type { MasterKeyPrivateObject, MasterKeyPublicObject } from "../../types/keys.ts"
import { base64ToArrayBuffer } from "../../utils/buffers.ts"

export function isValidMasterKeyPub(key: string) {
  try {
    const keyObject: MasterKeyPublicObject = JSON.parse(key)

    if (keyObject.type !== "MasterKeyPublic") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 1952) return false
    return true
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}

export function isValidMasterKeyPriv(key: string) {
  try {
    const keyObject: MasterKeyPrivateObject = JSON.parse(key)
    if (keyObject.type !== "MasterKeyPrivate") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 4032) return false
    return true
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}
