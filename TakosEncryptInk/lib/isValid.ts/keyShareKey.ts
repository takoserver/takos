import type {
  KeyShareKeyPrivateObject,
  KeyShareKeyPublicObject,
  keyShareSignKeyPrivateObject,
  keyShareSignKeyPublicObject,
} from "../../types/keys.ts"
import { base64ToArrayBuffer } from "../../utils/buffers.ts"

export function isValidkeyShareSignKeyPublic(key: string) {
  try {
    const keyObject: keyShareSignKeyPublicObject = JSON.parse(key)

    if (keyObject.type !== "keyShareSignKeyPublic") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 1952) return false
    if (isValidUUIDv7(keyObject.uuidv7)) return false
    return true
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}

export function isValidkeyShareSignKeyPrivate(key: string) {
  try {
    const keyObject: keyShareSignKeyPrivateObject = JSON.parse(key)
    if (keyObject.type !== "keyShareSignKeyPrivate") return false
    const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
    if (keyRaw.length !== 4032) return false
    if (isValidUUIDv7(keyObject.uuidv7)) return false
    // deno-lint-ignore no-unused-vars
  } catch (error) {
    return false
  }
}

function isValidUUIDv7(uuid: string): boolean {
  // UUIDv7のフォーマットを確認する正規表現
  const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidv7Regex.test(uuid)
}

export function isValidKeyShareKeyPublic(
  key: string,
): boolean {
  const keyObject: KeyShareKeyPublicObject = JSON.parse(key)
  if (keyObject.type !== "KeyShareKeyPublic") return false
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
  if (keyRaw.length !== 1184) return false
  if (isValidUUIDv7(keyObject.uuidv7)) return false
  return true
}

export function isValidKeyShareKeyPrivate(
  key: string,
): boolean {
  const keyObject: KeyShareKeyPrivateObject = JSON.parse(key)
  if (keyObject.type !== "KeyShareKeyPrivate") return false
  const keyRaw = new Uint8Array(base64ToArrayBuffer(keyObject.key))
  if (keyRaw.length !== 4032) return false
  if (isValidUUIDv7(keyObject.uuidv7)) return false
  return true
}
