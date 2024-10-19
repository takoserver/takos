import type { KeyShareKeyPub } from "../types.ts"
import type { IdentityKeyPub, AccountKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type { MasterKeyPub } from "../types/masterKey.ts"
import type { migrateKeyPub } from "../types/migrateKey.ts"
import type { RoomKey } from "../types/roomKey.ts"
import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffers.ts"

export async function hashHexKey(pubKey: MasterKeyPub | IdentityKeyPub | AccountKeyPub | RoomKey | KeyShareKeyPub | migrateKeyPub): Promise<string> {
    const keyPublic = new Uint8Array(base64ToArrayBuffer(pubKey.key))
    const hashHex = await crypto.subtle.digest("SHA-256", keyPublic)
    return arrayBufferToBase64(hashHex)
}