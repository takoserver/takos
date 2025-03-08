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
  //暗号化除外するユーザーのオブジェクト
  excludeUsers: {
    key: string;
    value: {
      key: string; //userId-roomId
      userId: string;
      roomId: string;
      timestamp: number;
    };
  };
  encrypteSetting: {
    key: string;
    value: {
      key: string; //roomid
      isEncrypte: boolean;
      timestamp: number;
    };
  };
  notification: {
    key: string;
    value: {
      key: string; //roomid
      isNotification: boolean;
    };
  };
}

export async function saveNotificationSetting({
  roomId,
  isNotification,
}: {
  roomId: string;
  isNotification: boolean;
}) {
  const db = await createTakosDB();
  await db.put("notification", {
    key: roomId,
    isNotification,
  });
}

export async function getNotificationSetting({
  roomId,
}: {
  roomId: string;
}): Promise<boolean> {
  const db = await createTakosDB();
  const setting = await db.get("notification", roomId);
  if (setting === null || setting === undefined) {
    return true;
  }
  return setting.isNotification === false ? false : true;
}

export async function saveEncryptSetting({
  roomId,
  isEncrypte,
}: {
  roomId: string;
  isEncrypte: boolean;
}) {
  const db = await createTakosDB();
  await db.put("encrypteSetting", {
    key: roomId,
    isEncrypte,
    timestamp: Date.now(),
  });
}

export async function getEncryptSetting(
  { roomId }: { roomId: string },
): Promise<boolean> {
  if (!roomId) {
    throw new Error("roomId is required");
  }
  const db = await createTakosDB();
  const setting = await db.get("encrypteSetting", roomId);

  if (setting === null || setting === undefined) {
    return true; // 設定がない場合はデフォルトでtrue
  }

  // 明示的に値をチェック
  return setting.isEncrypte === false ? false : true;
}

export async function saveExcludeUsers({
  userId,
  roomId,
}: {
  userId: string;
  roomId: string;
}) {
  const db = await createTakosDB();
  await db.put("excludeUsers", {
    key: `${userId}-${roomId}`,
    userId,
    roomId,
    timestamp: Date.now(),
  });
}

export async function getExcludeUsers({
  userId,
  roomId,
}: {
  userId: string;
  roomId: string;
}) {
  const db = await createTakosDB();
  return db.get("excludeUsers", `${userId}-${roomId}`);
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 17, {
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
      if (!db.objectStoreNames.contains("excludeUsers")) {
        db.createObjectStore("excludeUsers", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("encrypteSetting")) {
        db.createObjectStore("encrypteSetting", { keyPath: "key" });
      }
      // 許可されたobjectStoreのみ残し、その他を削除
      const allowedStores = [
        "shareKeys",
        "identityKeys",
        "accountKeys",
        "RoomKeys",
        "allowKeys",
        "shareSignKeys",
        "excludeUsers",
        "encrypteSetting",
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
  db.clear("shareSignKeys");
}
