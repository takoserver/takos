import { decryptDataDeviceKey, isValidAccountKeyPublic, keyHash } from "@takos/takos-encrypt-ink";
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
      id: string;
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
  latestAccountKeyHash: {
    key: string; //userId
    value: {
      key: string; //userId
      hash: string;
      timestamp: number;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 12, {
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
      db.createObjectStore("latestAccountKeyHash", {
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

export async function getLatestIdentityKey(deviceKey: string): Promise<{
  private: string;
  hash: string;
} | null> {
  const db = await createTakosDB();
  const data = await db.getAll("identityKeys");
  if (!data) return null;
  const decrypted = await decryptDataDeviceKey(
    deviceKey,
    data.sort((a, b) => b.timestamp - a.timestamp)[0].encryptedKey
  )
  if (!decrypted) return null;
  return {
    private: decrypted,
    hash: data.sort((a, b) => b.timestamp - a.timestamp)[0].key
  }
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

export async function isValidLatestAccountKey(
  userId: string,
  key: string, 
): Promise<boolean> {
  if(!userId || !key) return false;
  if(!isValidAccountKeyPublic(key)) return false;
  const db = await createTakosDB();
  const data = await db.get("latestAccountKeyHash", userId);
  if(!data) {
    await db.put("latestAccountKeyHash", {
      key: userId,
      hash: await keyHash(key),
      timestamp: JSON.parse(key).timestamp,
    });
    return true;
  }
  if(data.hash === await keyHash(key)) return true;
  if(new Date(data.timestamp) < new Date(JSON.parse(key).timestamp)) {
    await db.put("latestAccountKeyHash", {
      key: userId,
      hash: await keyHash(key),
      timestamp: JSON.parse(key).timestamp,
    });
    return true;
  }
  return false;
}