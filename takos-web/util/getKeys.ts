import { createTakosDB } from "./idbSchama.ts";
import {
  decryptDataDeviceKey,
  generateKeyHashHex,
} from "@takos/takos-encrypt-ink";
import type {
  AccountKey,
  deviceKey,
  deviceKeyPrivate,
  IdentityKey,
} from "@takos/takos-encrypt-ink";

export default async function getKeys(
  deviceKeyPrivate: deviceKeyPrivate,
): Promise<{
  deviceKey: deviceKey;
  accountAndIdentityKeys: {
    accountKey: AccountKey;
    identityKey: IdentityKey;
  }[];
  MasterKey: {
    key: string;
    hashHex: string;
  };
}> {
  const db = await createTakosDB();
  const deviceKeyPub = await db.get("deviceKey", "deviceKey");
  const encryptedAccountAndIdentityKeys = await db.getAll(
    "accountAndIdentityKeys",
  );
  const masterKey = await db.get("masterKey", "masterKey");
  db.close();
  if (!deviceKeyPub || !masterKey) {
    throw new Error("deviceKey or masterKey is not found");
  }
  const deviceKey: deviceKey = {
    public: deviceKeyPub.deviceKey,
    private: deviceKeyPrivate,
    hashHex: await generateKeyHashHex(deviceKeyPub.deviceKey.key),
  };
  const masterKeyString = await decryptDataDeviceKey(
    deviceKey,
    masterKey.masterKey,
  );
  if (!masterKeyString) {
    throw new Error("masterKey is not found");
  }
  const accountAndIdentityKeys: {
    timestamp: Date;
    accountKey: AccountKey;
    identityKey: IdentityKey;
  }[] = await Promise.all(
    encryptedAccountAndIdentityKeys.map(async (key) => {
      const accountKey = await decryptDataDeviceKey(deviceKey, key.accountKey);
      const identityKey = await decryptDataDeviceKey(
        deviceKey,
        key.identityKey,
      );
      if (!accountKey || !identityKey) {
        throw new Error("accountKey or identityKey is not found");
      }
      return {
        accountKey: JSON.parse(accountKey),
        identityKey: JSON.parse(identityKey),
        timestamp: key.timestamp,
      };
    }),
  );
  //時系列順に早い順にソート
  accountAndIdentityKeys.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const MasterKey = JSON.parse(masterKeyString);
  return {
    deviceKey,
    accountAndIdentityKeys,
    MasterKey,
  };
}
