import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"

import type {
    MasterKey,
    MasterKeyPrivate,
    MasterKeyPub,
    migrateDataSignKey,
} from "../types/masterKey.ts"

import type {
    AccountKey,
    AccountKeyPrivate,
    AccountKeyPub,
    IdentityKey,
    IdentityKeyPrivate,
    IdentityKeyPub,
} from "../types/identityKeyAndAccountKey.ts"

import type {
    RoomKey,
} from "../types/roomKey.ts"

import type {
    KeyShareKey,
    KeyShareKeyPrivate,
    KeyShareKeyPub,
    KeyShareSignKey,
    KeyShareSignKeyPrivate,
    KeyShareSignKeyPub,
} from "../types/keyShareKey.ts"

import type {
    deviceKey,
} from "../types/deviceKey.ts"

import type {
    migrateKey,
    migrateKeyPrivate,
    migrateKeyPub,
} from "../types/migrateKey.ts"
import { arrayBufferToBase64 } from "../utils/buffers.ts"
import type { Sign } from "../types/sign.ts"
import { sign } from "../utils/sign.ts"
import { concatenateUint8Arrays } from "../utils/connectBinary.ts"
import type { EncryptedDataAccountKey } from "../types/EncryptedData.ts"
import verifyKeys from "./verifyKeys.ts"
import { hashHexKey } from "../utils/hashHexKey.ts"
import { encryptDataAccountKey } from "./encryptData.ts"
export async function createMasterKey(): Promise<MasterKey> {
    const seed = crypto.getRandomValues(new Uint8Array(32))
    const aliceKeys = ml_dsa65.keygen(seed)
    const publicKeyString = arrayBufferToBase64(aliceKeys.publicKey)
    const privateKeyString = arrayBufferToBase64(aliceKeys.secretKey)
    const hashHex = await crypto.subtle.digest("SHA-256", aliceKeys.publicKey)
    const hashHexString = arrayBufferToBase64(hashHex)
    return {
      public: {
        key: publicKeyString,
        keyType: "masterPub",
        version: 1,
      },
      private: {
        key: privateKeyString,
        keyType: "masterPrivate",
        version: 1,
      },
      hashHex: hashHexString,
      version: 1,
    }
}
export async function createIdentityKeyAndAccountKey(MasterKey: MasterKey): Promise<{
    IdentityKey: [
        IdentityKey,
        Sign
    ],
    AccountKey: [
        AccountKey,
        Sign
    ]
}> {
    const idenSeed = crypto.getRandomValues(new Uint8Array(32))
    const idenKeys = ml_dsa65.keygen(idenSeed)
    const idenPublicKeyString = arrayBufferToBase64(idenKeys.publicKey)
    const idenPrivateKeyString = arrayBufferToBase64(idenKeys.secretKey)
    const idenHash = await crypto.subtle.digest("SHA-256", idenKeys.publicKey)
    const idenHashHex = arrayBufferToBase64(idenHash)
    const timestamp = new Date().toISOString()
    const idenSign = sign(MasterKey, concatenateUint8Arrays([idenKeys.publicKey, new TextEncoder().encode(timestamp)]))
    const IdentityKey: IdentityKey = {
        public: {
          key: idenPublicKeyString,
          keyType: "identityPub",
          version: 1,
          timestamp: timestamp,
        },
        private: {
            key: idenPrivateKeyString,
            keyType: "identityPrivate",
            version: 1,
        },
        hashHex: idenHashHex,
        version: 1,
    }
    const accountKey = ml_kem768.keygen()
    const accountPublicKeyString = arrayBufferToBase64(accountKey.publicKey)
    const accountPrivateKeyString = arrayBufferToBase64(accountKey.secretKey)
    const accountSign = sign(IdentityKey, concatenateUint8Arrays([accountKey.publicKey]))
    const AccountKey: AccountKey = {
      public: {
        key: accountPublicKeyString,
        keyType: "accountPub",
        version: 1,
      },
      private: {
        key: accountPrivateKeyString,
        keyType: "accountPrivate",
        version: 1,
      },
      version: 1,
    }
    return {
        IdentityKey: [IdentityKey, idenSign],
        AccountKey: [AccountKey, accountSign]
    }
}

export async function createRoomKey(keys: [MasterKeyPub, { key: IdentityKeyPub, sign: Sign},{ key: AccountKeyPub, sign: Sign}, string][], identityKey: IdentityKey, creditedMasterKey: {
    userid: string,
    key: string
}[]): Promise<{
    roomKey: RoomKey,
    EncryptedDataAccountKey: {
        [key: string]: EncryptedDataAccountKey
    }
    sign: Sign,
    updateMasterKey: {
        userid: string,
        key: string
    }[]
}> {
    const masterKeysHashHex: {
        [key: string]: string
    } = {}
    const updateMasterKey: {
        userid: string,
        key: string
    }[] = []
    {
        if(keys.length !== 0) {
            for(const key of keys) {
                if(!verifyKeys(key[1].key, key[0], key[1].sign, "identityPub")) {
                    throw new Error("Identity key is invalid")
                }
                if(!verifyKeys(key[2].key, key[1].key, key[2].sign, "accountPub")) {
                    throw new Error("Account key is invalid")
                }
                const hash = await hashHexKey(key[0])
                if(masterKeysHashHex[key[3]]) {
                    throw new Error("Master key is duplicated")
                }
                if(creditedMasterKey.length === 0) {
                    continue
                }
                if(creditedMasterKey.find((value) => value.userid === key[3])) {
                    const index = creditedMasterKey.findIndex((value) => value.userid === key[3])
                    if(hash !== creditedMasterKey[index].key) {
                        updateMasterKey.push({
                            userid: key[3],
                            key: hash
                        })
                    }
                }
                masterKeysHashHex[key[3]] = hash
            }
        }
    }
    const roomKey = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    )
    const roomKeyExport = await crypto.subtle.exportKey("raw", roomKey)
    const roomKeyString = arrayBufferToBase64(roomKeyExport)
    const roomKeyHash = await crypto.subtle.digest("SHA-256", roomKeyExport)
    const roomKeyHashHex = arrayBufferToBase64(roomKeyHash)
    const timeStamp = new Date().toISOString()
    const signature = sign(identityKey, concatenateUint8Arrays([new Uint8Array(roomKeyExport), new TextEncoder().encode(timeStamp)]))
    const EncryptedDataAccountKey: {
        [key: string]: EncryptedDataAccountKey
    } = {}
    const RoomKeyResult = {
        key: roomKeyString,
        keyType: "roomKey",
        timestamp: timeStamp,
        hashHex: roomKeyHashHex,
        version: 1,
        masterKeysHashHex: masterKeysHashHex
    }
    for(const key of keys) {
        //Encrypt
        const encryptedData = await encryptDataAccountKey(JSON.stringify(RoomKeyResult), key[2].key)
        EncryptedDataAccountKey[key[3]] = encryptedData
    }
    return {
        roomKey: {
            key: roomKeyString,
            keyType: "roomKey",
            timestamp: timeStamp,
            hashHex: roomKeyHashHex,
            version: 1,
            masterKeysHashHex: masterKeysHashHex
        },
        EncryptedDataAccountKey: EncryptedDataAccountKey,
        sign: signature,
        updateMasterKey: updateMasterKey
    }
}

export async function createKeyShareKey(identityKey: IdentityKey): Promise<[KeyShareKey, Sign]> {
    const keyShareKey = ml_kem768.keygen()
    const keyShareKeyPublicString = arrayBufferToBase64(keyShareKey.publicKey)
    const keyShareKeyPrivateString = arrayBufferToBase64(keyShareKey.secretKey)
    const timestamp = new Date().toISOString()
    const hash = await crypto.subtle.digest("SHA-256", keyShareKey.publicKey)
    const KeyShareKeyResult: KeyShareKey = {
        public: {
            key: keyShareKeyPublicString,
            keyType: "keySharePub",
            version: 1,
            timestamp: timestamp
        },
        private: {
            key: keyShareKeyPrivateString,
            keyType: "keySharePrivate",
            version: 1
        },
        version: 1,
        hashHex: arrayBufferToBase64(hash)
    }
    const keyShareKeySign = sign(identityKey, concatenateUint8Arrays([keyShareKey.publicKey, new TextEncoder().encode(timestamp)]))
    return [KeyShareKeyResult, keyShareKeySign]
}

export async function createKeyShareSignKey(identityKey: IdentityKey): Promise<[KeyShareSignKey, Sign]> {
    const keyShareSignKey = ml_kem768.keygen()
    const keyShareSignKeyPublicString = arrayBufferToBase64(keyShareSignKey.publicKey)
    const keyShareSignKeyPrivateString = arrayBufferToBase64(keyShareSignKey.secretKey)
    const timestamp = new Date().toISOString()
    const hash = await crypto.subtle.digest("SHA-256", keyShareSignKey.publicKey)
    const KeyShareSignKeyResult: KeyShareSignKey = {
        public: {
            key: keyShareSignKeyPublicString,
            keyType: "keyShareSignPub",
            version: 1,
            timestamp: timestamp
        },
        private: {
            key: keyShareSignKeyPrivateString,
            keyType: "keyShareSignPrivate",
            version: 1
        },
        version: 1,
        hashHex: arrayBufferToBase64(hash)
    }
    const keyShareSignKeySign = sign(identityKey, concatenateUint8Arrays([keyShareSignKey.publicKey, new TextEncoder().encode(timestamp)]))
    return [KeyShareSignKeyResult, keyShareSignKeySign]
}

export async function createDeviceKey(): Promise<deviceKey> {
    const deviceKeyRaw = await crypto.subtle.exportKey("raw", await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    ))
    const deviceKeyString = arrayBufferToBase64(deviceKeyRaw)
    return {
        key: deviceKeyString,
        keyType: "deviceKey",
        version: 1,
    }
}

export async function createMigrateKey(): Promise<migrateKey> {
    const migrateKeyRaw = ml_kem768.keygen()
    const migrateKeyPublicString = arrayBufferToBase64(migrateKeyRaw.publicKey)
    const migrateKeyPrivateString = arrayBufferToBase64(migrateKeyRaw.secretKey)
    const hash = await crypto.subtle.digest("SHA-256", migrateKeyRaw.publicKey)
    const hashString = arrayBufferToBase64(hash)
    return {
        public: {
            key: migrateKeyPublicString,
            keyType: "migratePub",
            version: 1,
        },
        private: {
            key: migrateKeyPrivateString,
            keyType: "migratePrivate",
            version: 1,
        },
        hashHex: hashString,
        version: 1,
    }
}

export async function createMigrateDataSignKey(): Promise<migrateDataSignKey> {
    const migrateDataSignKeyRaw = ml_kem768.keygen()
    const migrateDataSignKeyPublicString = arrayBufferToBase64(migrateDataSignKeyRaw.publicKey)
    const migrateDataSignKeyPrivateString = arrayBufferToBase64(migrateDataSignKeyRaw.secretKey)
    const hash = await crypto.subtle.digest("SHA-256", migrateDataSignKeyRaw.publicKey)
    const hashString = arrayBufferToBase64(hash)
    return {
        public: {
            key: migrateDataSignKeyPublicString,
            keyType: "migrateDataSignPub",
            version: 1,
        },
        private: {
            key: migrateDataSignKeyPrivateString,
            keyType: "migrateDataSignPrivate",
            version: 1,
        },
        hashHex: hashString,
        version: 1,
    }
}
