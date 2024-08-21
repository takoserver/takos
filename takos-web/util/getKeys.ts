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
    const deviceKey: deviceKey = {
        
    }
}