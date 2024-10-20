import type { deviceKey } from "../types/deviceKey.ts"
import type { AccountKeyPub, IdentityKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type { KeyShareKeyPub } from "../types/keyShareKey.ts"
import type { MasterKeyPub } from "../types/masterKey.ts"
import type { migrateKeyPub } from "../types/migrateKey.ts"
import type { RoomKey } from "../types/roomKey.ts"
import { base64ToArrayBuffer } from "./buffers.ts"
import { arrayBufferToHex } from "./hex.ts"
export async function hashHexKey(
  pubKey:
    | MasterKeyPub
    | IdentityKeyPub
    | AccountKeyPub
    | RoomKey
    | migrateKeyPub
    | KeyShareKeyPub
    | deviceKey,
): Promise<string> {
  const keyPublic = new Uint8Array(base64ToArrayBuffer(pubKey.key))
  const hashHex = await crypto.subtle.digest("SHA-256", keyPublic)
  return arrayBufferToHex(hashHex)
}
