import { DBSchema, IDBPDatabase, openDB } from "idb";
export interface TakosDB extends DBSchema {
  keyShareKeys: {
    key: string;
    value: {
      keyShareKey: string;
      keyShareSignKey: string;
      timestamp: string;
      key?: string;
      keyHash: string;
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
      timestamp: string;
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
  latestRoomKeyHash: {
    key: string; // roomid
    value: {
      keyHash: string;
      timestamp: string;
      key?: string;
    };
  };
  latestIdentityKeyHash: {
    key: string; // userName
    value: {
      timestamp: string;
      key?: string;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 9, {
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
      if (!db.objectStoreNames.contains("latestRoomKeyHash")) {
        db.createObjectStore("latestRoomKeyHash", {
          keyPath: "key",
        });
      }
      if (!db.objectStoreNames.contains("latestIdentityKeyHash")) {
        db.createObjectStore("latestIdentityKeyHash", {
          keyPath: "key",
        });
      }
    },
  });
}

type LocalStorageKey =
  | "sessionid"
  | "userName"
  | "server"
  | "masterKey"
  | "sessionuuid";

export const localStorageEditor = {
  set: (key: LocalStorageKey, value: string) => {
    localStorage.setItem(key, value);
  },
  get: (key: LocalStorageKey) => {
    return localStorage.getItem(key);
  },
};
