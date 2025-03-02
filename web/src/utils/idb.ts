import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
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
      metaData: string;
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
  shareSignKeys: {
    key: string;
    value: {
      key: string; //hash
      encryptedKey: string;
      timestamp: number;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 15, {
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
      if (!db.objectStoreNames.contains("shareSignKeys")) {
        db.createObjectStore("shareSignKeys", { keyPath: "key" });
      }
      // 許可されたobjectStoreのみ残し、その他を削除
      const allowedStores = [
        "shareKeys",
        "identityKeys",
        "accountKeys",
        "RoomKeys",
        "allowKeys",
        "shareSignKeys",
      ];
      for (const storeName of Array.from(db.objectStoreNames)) {
        if (!allowedStores.includes(storeName)) {
          db.deleteObjectStore(storeName);
        }
      }
    },
  });
}

export interface AccountKey {
  privateKey: string;
  publicKey: string;
  sign: string;
}

export interface IdentityKey {
  privateKey: string;
  publicKey: string;
  sign: string;
}

export interface ShareSignKey {
  privateKey: string;
  publicKey: string;
  sign: string;
}


export async function encryptAccountKey({
  deviceKey,
  accountKey,
}: {
  deviceKey: string;
  accountKey: AccountKey;
}): Promise<string> {
  const rawString = JSON.stringify(accountKey);
  const encryptedAccountKey = await encryptDataDeviceKey(
    deviceKey,
    rawString,
  );
  if (!encryptedAccountKey) {
    throw new Error("encryptedAccountKey is not generated");
  }
  return encryptedAccountKey;
}

export async function decryptAccountKey({
  deviceKey,
  encryptedAccountKey,
}: {
  deviceKey: string;
  encryptedAccountKey: string;
}): Promise<AccountKey> {
  const decryptedAccountKey = await decryptDataDeviceKey(
    deviceKey,
    encryptedAccountKey,
  );
  if (!decryptedAccountKey) {
    throw new Error("decryptedAccountKey is not generated");
  }
  return JSON.parse(decryptedAccountKey) as AccountKey;
}

export async function encryptIdentityKey({
  deviceKey,
  identityKey,
}: {
  deviceKey: string;
  identityKey: IdentityKey;
}): Promise<string> {
  const rawString = JSON.stringify(identityKey);
  const encryptedIdentityKey = await encryptDataDeviceKey(
    deviceKey,
    rawString,
  );
  if (!encryptedIdentityKey) {
    throw new Error("encryptedIdentityKey is not generated");
  }
  return encryptedIdentityKey;
}

export async function decryptIdentityKey({
  deviceKey,
  encryptedIdentityKey,
}: {
  deviceKey: string;
  encryptedIdentityKey: string;
}): Promise<IdentityKey> {
  const decryptedIdentityKey = await decryptDataDeviceKey(
    deviceKey,
    encryptedIdentityKey,
  );
  if (!decryptedIdentityKey) {
    throw new Error("decryptedIdentityKey is not generated");
  }
  return JSON.parse(decryptedIdentityKey) as IdentityKey;
}

export async function encryptShareSignKey({
  deviceKey,
  shareSignKey,
}: {
  deviceKey: string;
  shareSignKey: ShareSignKey;
}): Promise<string> {
  const rawString = JSON.stringify(shareSignKey);
  const encryptedShareSignKey = await encryptDataDeviceKey(
    deviceKey,
    rawString,
  );
  if (!encryptedShareSignKey) {
    throw new Error("encryptedShareSignKey is not generated");
  }
  return encryptedShareSignKey;
}

export async function decryptShareSignKey({
  deviceKey,
  encryptedShareSignKey,
}: {
  deviceKey: string;
  encryptedShareSignKey: string;
}): Promise<ShareSignKey> {
  const decryptedShareSignKey = await decryptDataDeviceKey(
    deviceKey,
    encryptedShareSignKey,
  );
  if (!decryptedShareSignKey) {
    throw new Error("decryptedShareSignKey is not generated");
  }
  return JSON.parse(decryptedShareSignKey) as ShareSignKey;
}

export async function clearDB() {
  const db = await createTakosDB();
  db.clear("allowKeys");
  db.clear("identityKeys");
  db.clear("accountKeys");
  db.clear("shareKeys");
  db.clear("RoomKeys");
}
