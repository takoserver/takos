import { base64ToArrayBuffer } from "../_main.ts"
import type { migrateDataSignKeyPub, RoomKey, Sign } from "../types.ts"
import type { deviceKey } from "../types/deviceKey.ts"
import type { AccountKeyPub, IdentityKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type { KeyShareSignKeyPub, KeyShareKeyPub } from "../types/keyShareKey.ts"
import type { MasterKeyPub } from "../types/masterKey.ts"
import type { migrateKeyPub } from "../types/migrateKey.ts"
import { concatenateUint8Arrays } from "../utils/connectBinary.ts"
import { sign, verify } from "../utils/sign.ts"

export default function verifyKeys(
    signedKey: AccountKeyPub | IdentityKeyPub | migrateKeyPub | KeyShareSignKeyPub | migrateDataSignKeyPub | KeyShareKeyPub | deviceKey | RoomKey,
    signKey: MasterKeyPub | IdentityKeyPub | KeyShareSignKeyPub | migrateDataSignKeyPub,
    signature: Sign,
    type: string
) {
    // timestampがある鍵は、timestampを含めてけんしょうする
    if(type !== signedKey.keyType) {
        throw new Error("Key type is invalid")
    }
    //"deviceKey" | "accountPub" | "identityPub" | "migratePub" | "keyShareSignPub" | "migrateDataSignPub" | "keySharePub"
    //timestampを含むやつ: identityKey, keyShareKey, keyShareSignkey,
    if(signedKey.keyType === "identityPub" || signedKey.keyType === "keyShareSignPub" || signedKey.keyType === "keySharePub" || signedKey.keyType === "roomKey") {
        const timestamp = signedKey.timestamp
        const key = signedKey.key
        const keyBuffer = base64ToArrayBuffer(key)
        const timestampBuffer = new TextEncoder().encode(timestamp)
        const signedData = concatenateUint8Arrays([new Uint8Array(keyBuffer), timestampBuffer])
        if(verify(signKey, signedData, signature)) {
            return true
        }
        return false
    }
    const key = signedKey.key
    const keyBuffer = new Uint8Array(base64ToArrayBuffer(key))
    if(verify(signKey, keyBuffer, signature)) {
        return true
    }
    return false
}