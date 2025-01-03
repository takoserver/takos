import { DBSchema, IDBPDatabase, openDB } from "idb";
import {
  type deviceKeyPub,
  type EncryptedDataDeviceKey,
  signData,
} from "@takos/takos-encrypt-ink";
import { AppStateType } from "./types.ts";
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
  config: {
    key: "config";
    value: {
      value: string;
      key?: string;
    };
  };
  identityAndAccountKeys: {
    key: string;
    value: {
      encryptedIdentityKey: EncryptedDataDeviceKey;
      encryptedAccountKey: EncryptedDataDeviceKey;
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
      allowedUserId: string;
      type: "allow" | "recognition";
      timestamp: string;
      sended: boolean;
    };
  };
  allowServers: {
    key: string;
    value: {
      key?: string;
      domain: string;
      timestamp: string;
      sended: boolean;
    };
  };
}

export function createTakosDB(): Promise<IDBPDatabase<TakosDB>> {
  return openDB<TakosDB>("takos-db", 7, {
    upgrade(db) {
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
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", {
          keyPath: "key",
        });
      }
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
      if (!db.objectStoreNames.contains("allowServers")) {
        db.createObjectStore("allowServers", {
          keyPath: "key",
        });
      }
    },
  });
}
export async function saveToDbMasterKey(
  masterKey: EncryptedDataDeviceKey,
): Promise<void> {
  const db = await createTakosDB();
  await db.put("masterKey", {
    masterKey: masterKey,
    key: "masterKey",
  });
}
export async function saveToDbDeviceKey(
  deviceKey: deviceKeyPub,
): Promise<void> {
  const db = await createTakosDB();
  await db.put("deviceKey", {
    deviceKey: deviceKey,
    key: "deviceKey",
    timestamp: new Date(),
  });
}
export async function saveToDbKeyShareKeys(
  keyShareKey: EncryptedDataDeviceKey,
  hashHex: string,
): Promise<void> {
  const db = await createTakosDB();
  await db.put("keyShareKeys", {
    keyShareKey: keyShareKey,
    key: hashHex,
    timestamp: new Date(),
  });
}
export async function saveToDbConfig(
  value: string,
  key: string,
): Promise<void> {
  const db = await createTakosDB();
  await db.put("config", {
    value: value,
    key: key,
  });
}

export async function saveToDbIdentityAndAccountKeys(
  encryptedIdentityKey: EncryptedDataDeviceKey,
  encryptedAccountKey: EncryptedDataDeviceKey,
  hashHex: string,
): Promise<void> {
  const db = await createTakosDB();
  await db.put("identityAndAccountKeys", {
    encryptedIdentityKey: encryptedIdentityKey,
    encryptedAccountKey: encryptedAccountKey,
    hashHex: hashHex,
    key: hashHex,
    sended: false,
  });
}
export async function saveToDbAllowKeys(
  keyHash: string,
  allowedUserId: string,
  type: "allow" | "recognition",
  timestamp: string,
  state: AppStateType,
  isSendServer: boolean,
): Promise<void> {
  let sended = true;
  const db = await createTakosDB();
  const existingKey = await db.get("allowKeys", keyHash);
  if (existingKey) {
    if (
      existingKey.timestamp >= timestamp &&
      existingKey.allowedUserId === allowedUserId
    ) {
      return;
    }
  }
  if (isSendServer && type === "recognition") {
    const recognitionKey = JSON.stringify({
      userId: allowedUserId,
      keyHash,
      type: "recognition",
      timestamp,
    });
    const latestIdentityAndAccountKeys =
      state.IdentityKeyAndAccountKeys.value[0];
    const recognitionKeySign = signData(
      latestIdentityAndAccountKeys.identityKey,
      recognitionKey,
    );
    const res = await fetch(
      "/takos/v2/client/keys/allowKey/recognition",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: recognitionKey,
          sign: recognitionKeySign,
        }),
      },
    );
    const data = await res.json();
    if (data.status === false) {
      sended = false;
    }
    sended = true;
  }
  if (isSendServer && type === "allow") {
    const allowKey = JSON.stringify({
      userId: allowedUserId,
      keyHash,
      type: "allow",
      timestamp,
    });
    const latestIdentityAndAccountKeys =
      state.IdentityKeyAndAccountKeys.value[0];
    const allowKeySign = signData(
      latestIdentityAndAccountKeys.identityKey,
      allowKey,
    );
    const res = await fetch(
      "/takos/v2/client/keys/allowKey/allow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: allowKey,
          sign: allowKeySign,
        }),
      },
    );
    const data = await res.json();
    if (data.status === false) {
      sended = false;
    }
    sended = true;
  }
  await db.put("allowKeys", {
    keyHash: keyHash,
    allowedUserId: allowedUserId,
    type: type,
    timestamp: timestamp,
    key: keyHash,
    sended: sended,
  });
}

export async function saveToDbAllowServers(
  domain: string,
  timestamp: string,
  state: AppStateType,
  isSendServer: boolean,
): Promise<void> {
  const db = await createTakosDB();
  let sended = true;
  if (isSendServer) {
    const latestIdentityAndAccountKeys =
      state.IdentityKeyAndAccountKeys.value[0];
    const key = JSON.stringify({
      domain: domain,
      type: "allowServer",
      timestamp: timestamp,
    });
    const sign = signData(latestIdentityAndAccountKeys.identityKey, key);
    const res = await fetch(
      "/takos/v2/client/keys/allowServer",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: key,
          sign: sign,
        }),
      },
    );
    const data = await res.json();
    if (data.status === false) {
      sended = false;
    }
    sended = true;
  }
  await db.put("allowServers", {
    domain: domain,
    timestamp: timestamp,
    key: domain,
    sended: sended,
  });
}
