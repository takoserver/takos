import { DBSchema, IDBPDatabase, openDB } from "idb";
type KeyValue = {
    key: string; // これを追加
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
  return openDB<TakosDB>("takos-db", 1, {
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
