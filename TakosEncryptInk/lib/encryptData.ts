import type { EncryptedDataAccountKey, EncryptedDataDeviceKey, EncryptedDataKeyShareKey, EncryptedDataRoomKey } from "../types/EncryptedData.ts";
import type { AccountKeyPub } from "../types/identityKeyAndAccountKey.ts";
import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils/buffers.ts"
import { hashHexKey } from "../utils/hashHexKey.ts"
import type {  IdentityKey, KeyShareSignKey } from "../types.ts"
import type { migrateDataSignKey } from "../types/masterKey.ts"
import type { Sign } from "../types/sign.ts"
import { sign } from "../utils/sign.ts"


export async function encryptDataAccountKey(data: string, pubKey: AccountKeyPub): Promise<EncryptedDataAccountKey> {
    const dataUint8Array = new TextEncoder().encode(data)
    const keys = ml_kem768.encapsulate(new Uint8Array(base64ToArrayBuffer(pubKey.key)))
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

export function signEncryptedData(
    EncryptedData: EncryptedDataAccountKey | EncryptedDataDeviceKey | EncryptedDataRoomKey | EncryptedDataKeyShareKey,
    Key: IdentityKey | KeyShareSignKey | migrateDataSignKey,
): Sign {
    const data = new Uint8Array(base64ToArrayBuffer(EncryptedData.encryptedData))
    return sign(Key, data)
}