import { DBSchema, IDBPDatabase, openDB } from "idb";
export interface TakosDB extends DBSchema {
  keyShareKeys: {
    key: string;
    value: {
      keyShareKey: string;
      timestamp: string;
    };
  };
  identityAndAccountKeys: {
    key: string;
    value: {
      encryptedIdentityKey: string;
      encryptedAccountKey: string;
      hashHex: string;
      key?: string;
      sended: boolean;
    };
  };
  allowKeys: {
    key: string;
    value: {
      key?: string;
      keyHash: string;
      userId: string;
      timestamp: string;
      latest: boolean;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 7, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("identityAndAccountKeys")) {
        db.createObjectStore("identityAndAccountKeys", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("allowKeys")) {
        db.createObjectStore("allowKeys", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("keyShareKeys")) {
        db.createObjectStore("keyShareKeys", {
          keyPath: "key",
        });
      }
    },
  });
}

type LocalStorageKey = "sessionid" | "userName" | "server" | "masterKey";

export const localStorageEditor = {
  set: (key: LocalStorageKey, value: string) => {
    localStorage.setItem(key, value);
  },
  get: (key: LocalStorageKey) => {
    return localStorage.getItem(key);
  },
}