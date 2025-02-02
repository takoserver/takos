import {
  decryptDataDeviceKey,
  isValidAccountKeyPublic,
  keyHash,
} from "@takos/takos-encrypt-ink";
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
  RoomKeys: {
    key: string;
    value: {
      key: string; //hash
      encryptedKey: string;
      timestamp: number;
      roomid: string;
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
  return openDB<TakosDB>("takos-db", 14, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("shareKeys")) {
        db.createObjectStore("shareKeys", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("identityKeys")) {
        db.createObjectStore("identityKeys", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("accountKeys")) {
        db.createObjectStore("accountKeys", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("RoomKeys")) {
        db.createObjectStore("RoomKeys", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("allowKeys")) {
        db.createObjectStore("allowKeys", { keyPath: "key" });
      }
      // 許可されたobjectStoreのみ残し、その他を削除
      const allowedStores = [
        "shareKeys",
        "identityKeys",
        "accountKeys",
        "RoomKeys",
        "allowKeys",
      ];
      for (const storeName of Array.from(db.objectStoreNames)) {
        if (!allowedStores.includes(storeName)) {
          db.deleteObjectStore(storeName);
        }
      }
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

export async function getLatestIdentityKey(deviceKey: string): Promise<
  {
    private: string;
    hash: string;
  } | null
> {
  const db = await createTakosDB();
  const data = await db.getAll("identityKeys");
  if (!data) return null;
  const decrypted = await decryptDataDeviceKey(
    deviceKey,
    data.sort((a, b) => b.timestamp - a.timestamp)[0].encryptedKey,
  );
  if (!decrypted) return null;
  return {
    private: decrypted,
    hash: data.sort((a, b) => b.timestamp - a.timestamp)[0].key,
  };
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
  db.clear("RoomKeys");
}
