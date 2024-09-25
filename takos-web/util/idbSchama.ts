import { DBSchema, IDBPDatabase, openDB } from "idb"
import type {
  AccountKeyPub,
  deviceKeyPub,
  EncryptedDataDeviceKey,
  IdentityKeyPub,
  RoomKey,
} from "@takos/takos-encrypt-ink"
export interface TakosDB extends DBSchema {
  deviceKey: {
    key: "deviceKey"
    value: {
      deviceKey: deviceKeyPub
      key?: string
      timestamp: Date
    }
  }
  keyShareKeys: {
    key: string
    value: {
      keyShareKey: EncryptedDataDeviceKey
      key?: string
      timestamp: Date
    }
  }
  masterKey: {
    key: "masterKey"
    value: {
      masterKey: EncryptedDataDeviceKey
      key?: string
    }
  }
  config: {
    key: "config"
    value: {
      value: string
      key?: string
    }
  }
  identityAndAccountKeys: {
    key: string
    value: {
      encryptedIdentityKey: EncryptedDataDeviceKey
      encryptedAccountKey: EncryptedDataDeviceKey
      hashHex: string
      keyExpiration: string
      key?: string
    }
  }
  allowKeys: {
    key: string
    value: {
      key?: string
      keyHash: string
      allowedUserId: string
      type: "allow" | "recognition"
      timestamp: string
    }
  }
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 6, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("deviceKey")) {
        db.createObjectStore("deviceKey", {
          keyPath: "key",
        })
      }
      if (!db.objectStoreNames.contains("keyShareKeys")) {
        db.createObjectStore("keyShareKeys", {
          keyPath: "key",
        })
      }
      if (!db.objectStoreNames.contains("masterKey")) {
        db.createObjectStore("masterKey", {
          keyPath: "key",
        })
      }
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", {
          keyPath: "key",
        })
      }
      if (!db.objectStoreNames.contains("identityAndAccountKeys")) {
        db.createObjectStore("identityAndAccountKeys", {
          keyPath: "key",
        })
      }
      if (!db.objectStoreNames.contains("allowKeys")) {
        db.createObjectStore("allowKeys", {
          keyPath: "key",
        })
      }
    },
  })
}
export async function saveToDbMasterKey(
  masterKey: EncryptedDataDeviceKey,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("masterKey", {
    masterKey: masterKey,
    key: "masterKey",
  })
}
export async function saveToDbDeviceKey(
  deviceKey: deviceKeyPub,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("deviceKey", {
    deviceKey: deviceKey,
    key: "deviceKey",
    timestamp: new Date(),
  })
}
export async function saveToDbKeyShareKeys(
  keyShareKey: EncryptedDataDeviceKey,
  hashHex: string,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("keyShareKeys", {
    keyShareKey: keyShareKey,
    key: hashHex,
    timestamp: new Date(),
  })
}
export async function saveToDbConfig(
  value: string,
  key: string,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("config", {
    value: value,
    key: key,
  })
}

export async function saveToDbIdentityAndAccountKeys(
  encryptedIdentityKey: EncryptedDataDeviceKey,
  encryptedAccountKey: EncryptedDataDeviceKey,
  hashHex: string,
  keyExpiration: string,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("identityAndAccountKeys", {
    encryptedIdentityKey: encryptedIdentityKey,
    encryptedAccountKey: encryptedAccountKey,
    hashHex: hashHex,
    keyExpiration: keyExpiration,
    key: hashHex,
  })
}
export async function saveToDbAllowKeys(
  keyHash: string,
  allowedUserId: string,
  type: "allow" | "recognition",
  timestamp: string,
): Promise<void> {
  const db = await createTakosDB()
  await db.put("allowKeys", {
    keyHash: keyHash,
    allowedUserId: allowedUserId,
    type: type,
    timestamp: timestamp,
    key: keyHash,
  })
}
