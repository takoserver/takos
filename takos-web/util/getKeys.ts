import { createTakosDB } from "./idbSchama.ts";
import { decryptDataDeviceKey, generateKeyHashHex } from "@takos/takos-encrypt-ink";
import type { deviceKey, deviceKeyPrivate } from "@takos/takos-encrypt-ink";

export default async function getKeys(deviceKeyPrivate: deviceKeyPrivate) {
  const db = await createTakosDB();
  const deviceKeyPub = await db.get("deviceKey", "deviceKey");
    const retrievedMasterKey = await db.get("masterKey", "masterKey");
    const accountAndIdentityKeys = await db.getAll("accountAndIdentityKeys");

    if(!deviceKeyPub) {
        throw new Error("deviceKey is not found");
    }

    const deviceKey: deviceKey = {
        public: deviceKeyPub,
        private: deviceKeyPrivate,
        hashHex: await generateKeyHashHex(deviceKeyPub.key),
    }

    if(!retrievedMasterKey) {
        throw new Error("masterKey is not found");
    }
    const masterKey = await decryptDataDeviceKey(deviceKey, retrievedMasterKey.masterKey);

    const accountKeys = accountAndIdentityKeys.map(async (key) => {
        const accountKey = await decryptDataDeviceKey(deviceKey, key.accountKey);
        const identityKey = await decryptDataDeviceKey(deviceKey, key.identityKey);
        if(!accountKey || !identityKey) {
            throw new Error("Failed to decrypt accountKey or identityKey");
        }
        return {
            accountKey: JSON.parse(accountKey),
            identityKey: JSON.parse(identityKey),
            hashHex: await generateKeyHashHex(JSON.parse(accountKey).public.key),
        }
    });
}
