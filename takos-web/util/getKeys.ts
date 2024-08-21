import { createTakosDB } from "./idbSchama.ts";
import {
    decryptDataDeviceKey,
} from "@takos/takos-encrypt-ink"
import type { deviceKeyPrivate, deviceKey } from "@takos/takos-encrypt-ink"

export default async function getKeys(deviceKeyPrivate: deviceKeyPrivate) {
    const db = await createTakosDB();
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");
    const keys = await store.getAll();
    const deviceKeyPub = keys.find((key) => key.keyType === "deviceKey")
    if (!deviceKeyPub) {
        throw new Error("Device key not found");
    }
    const deviceKey: deviceKey = {
        public: JSON.parse(deviceKeyPub.encryptedKey),
        private: deviceKeyPrivate,
        hashHex: deviceKeyPub.encryptedKey
    };
    const encryptedIdentityKey = keys.find((key) => key.keyType === "identityKey")
    const encryptedMasterKey = keys.find((key) => key.keyType === "masterKey")
    const encryptedAccountKey = keys.find((key) => key.keyType === "accountKey")
    if (!encryptedIdentityKey || !encryptedMasterKey || !encryptedAccountKey) {
        throw new Error("Keys not found");
    }
    const identityKey = await decryptDataDeviceKey(deviceKey, JSON.parse(encryptedIdentityKey.encryptedKey));
    const masterKey = await decryptDataDeviceKey(deviceKey, JSON.parse(encryptedMasterKey.encryptedKey));
    const accountKey = await decryptDataDeviceKey(deviceKey, JSON.parse(encryptedAccountKey.encryptedKey));
    if(!identityKey || !masterKey || !accountKey) {
        console.log(keys);
        throw new Error("Failed to decrypt keys");
    }
    return {
        deviceKey,
        identityKey,
        masterKey,
        accountKey
    }
}