import { DBSchema, IDBPDatabase, openDB } from "idb";
import type { AccountKeyPub, deviceKeyPub, IdentityKeyPub, EncryptedDataDeviceKey, RoomKey } from "@takos/takos-encrypt-ink";
export interface TakosDB extends DBSchema {
  deviceKey: {
    key: "deviceKey";
    value: deviceKeyPub;
  };
  accountAndIdentityKeys: {
    key: string; // hashHex
    value: {
      accountKey: EncryptedDataDeviceKey;
      identityKey: EncryptedDataDeviceKey;
    }
  };
  roomKeys: {
    key: string; //roomid
    value: {
      roomKey: RoomKey;
      hashHex: string;
    }[]
  };
  keyShareKeys: {
    key: string;
    value: {
      keyShareKey: EncryptedDataDeviceKey;
    }
  };
  masterKey: {
    key: "masterKey";
    value: {
      masterKey: EncryptedDataDeviceKey;
    }
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
      if (!db.objectStoreNames.contains("accountAndIdentityKeys")) {
        db.createObjectStore("accountAndIdentityKeys", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("roomKeys")) {
        db.createObjectStore("roomKeys", {
          keyPath: "key",
        });
      }
    },
  });
}