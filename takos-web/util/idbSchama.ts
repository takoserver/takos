import { DBSchema, IDBPDatabase, openDB } from "idb";
import type {
  AccountKeyPub,
  deviceKeyPub,
  EncryptedDataDeviceKey,
  IdentityKeyPub,
  RoomKey,
} from "@takos/takos-encrypt-ink";
export interface TakosDB extends DBSchema {
  deviceKey: {
    key: "deviceKey";
    value: {
      deviceKey: deviceKeyPub;
      key?: string;
      timestamp: Date;
    };
  };
  keyShareKeys: {
    key: string;
    value: {
      keyShareKey: EncryptedDataDeviceKey;
      key?: string;
      timestamp: Date;
    };
  };
  masterKey: {
    key: "masterKey";
    value: {
      masterKey: EncryptedDataDeviceKey;
      key?: string;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 1, {
    upgrade(db) {
      // keysオブジェクトストアを作成
      if (!db.objectStoreNames.contains("deviceKey")) {
        db.createObjectStore("deviceKey", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("keyShareKeys")) {
        db.createObjectStore("keyShareKeys", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("masterKey")) {
        db.createObjectStore("masterKey", {
          keyPath: "key",
        });
      }
    },
  });
}
