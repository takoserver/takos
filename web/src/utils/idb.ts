import { decryptDataDeviceKey } from "@takos/takos-encrypt-ink";
import { DBSchema, IDBPDatabase, openDB } from "idb";
export interface TakosDB extends DBSchema {
  shareKeys: {
    key: string;
    value: {
      key: string; //hash
      encryptedKey: string;
      timestamp: number;
    };
  };
  identityKeys: {
    key: string;
    value: {
      key: string; //hash
      encryptedKey: string;
      timestamp: number;
    };
  };
  accountKeys: {
    key: string;
    value: {
      key: string; //hash
      encryptedKey: string;
      timestamp: number;
    };
  };
  latestRoomkeyHash: {
    key: string;
    value: {
      key: string; //roomId
      timestamp: number;
      hash: string;
    };
  };
  allowKeys: {
    key: string;
    value: {
      key: string; //hash
      userId: string;
      timestamp: number;
      latest: boolean;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 10, {
    upgrade(db) {
      db.createObjectStore("shareKeys", {
        keyPath: "key",
      });
      db.createObjectStore("identityKeys", {
        keyPath: "key",
      });
      db.createObjectStore("accountKeys", {
        keyPath: "key",
      });
      db.createObjectStore("latestRoomkeyHash", {
        keyPath: "key",
      });
      db.createObjectStore("allowKeys", {
        keyPath: "key",
      });
    },
  });
}

export async function getAccountKey(
  hash: string,
  deviceKey: string,
): Promise<string | null> {
  const db = await createTakosDB();
  const data = await db.get("accountKeys", hash);
  if (!data) return null;
  return await decryptDataDeviceKey(deviceKey, data.encryptedKey);
}

export async function getIdentityKey(
  hash: string,
  deviceKey: string,
): Promise<string | null> {
  const db = await createTakosDB();
  const data = await db.get("identityKeys", hash);
  if (!data) return null;
  return await decryptDataDeviceKey(deviceKey, data.encryptedKey);
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

export async function clearDB() {
  const db = await createTakosDB();
  db.clear("allowKeys");
  db.clear("identityKeys");
  db.clear("accountKeys");
  db.clear("shareKeys");
  db.clear("latestRoomkeyHash");
}