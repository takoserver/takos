import { DBSchema, IDBPDatabase, openDB } from "idb";
import type {
  AccountKey,
  deviceKeyPub,
  IdentityKey,
  MasterKey,
  MasterKeyPub,
} from "@takos/takos-encrypt-ink";

type KeyValue = {
  encryptedKey: string;
  keyType: "accountKey" | "identityKey" | "masterKey" | "deviceKey";
};

export interface TakosDB extends DBSchema {
  keys: {
    key: string;
    value: KeyValue;
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-database", 1, {
    upgrade(db) {
      // keysオブジェクトストアを作成
      if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", {
          keyPath: "key",
        });
      }
    },
  });
}
