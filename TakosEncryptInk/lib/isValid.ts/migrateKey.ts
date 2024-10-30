import type {
  migrateKeyPrivateObject,
  migrateKeyPublicObject,
  migrateSignKeyPrivateObject,
  migrateSignKeyPublicObject,
} from "../../types/keys.ts"
import { base64ToArrayBuffer } from "../../utils/buffers.ts"

export function isValidmigrateSignKeyyPublic(key: string): boolean {
  try {
    const keyObject: migrateSignKeyPublicObject = JSON.parse(key)

    if (keyObject.type !== "migrateSignKeyPublic") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 1952) return false
    return true
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}

export function isValidmigrateSignKeyPrivate(key: string): boolean {
  try {
    const keyObject: migrateSignKeyPrivateObject = JSON.parse(key)
    if (keyObject.type !== "migrateSignKeyPrivate") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 4032) return false
    return true
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}

export function isValidmigrateKeyPublic(
  key: string,
): boolean {
  const keyObject: migrateKeyPublicObject = JSON.parse(key)
  if (keyObject.type !== "migrateKeyPublic") return false
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
  if (keyRaw.length !== 1184) return false
  return true
}

export function isValidmigrateKeyPrivate(
  key: string,
): boolean {
  const keyObject: migrateKeyPrivateObject = JSON.parse(key)
  if (keyObject.type !== "migrateKeyPrivate") return false
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
  if (keyRaw.length !== 4032) return false
  return true
}
