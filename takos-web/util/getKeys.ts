import { createTakosDB } from "./idbSchama.ts";
import {
  decryptAndVerifyDataWithKeyShareKey,
  decryptDataDeviceKey,
  generateKeyHashHex,
} from "@takos/takos-encrypt-ink";
import type {
  AccountKey,
  deviceKey,
  deviceKeyPrivate,
  EncryptedDataKeyShareKey,
  IdentityKey,
  KeyShareKey,
  MasterKey,
} from "@takos/takos-encrypt-ink";

export default async function getKeys(
  deviceKeyPrivate: deviceKeyPrivate,
  keys: {
    identityKey: {
      key: EncryptedDataKeyShareKey;
      sessionid: string;
    };
    accountKey: {
      key: EncryptedDataKeyShareKey;
      sessionid: string;
    };
  }[],
): Promise<
  {
    masterKey: MasterKey;
    deviceKey: deviceKey;
    keyShareKeys: KeyShareKey[];
    identityKeyAndAccountKeys: {
      identityKey: IdentityKey;
      accountKey: AccountKey;
      hashHex: string;
      keyExpiration: string;
    }[];
  } | null
> {
  try {
    const db = await createTakosDB();
    const deviceKeyPub = await db.get("deviceKey", "deviceKey");
    const encryptedMasterKey = await db.get("masterKey", "masterKey");
    const encryptedKeyShareKeys = await db.getAll("keyShareKeys");
    if (!deviceKeyPub || !encryptedMasterKey || !encryptedKeyShareKeys) {
      throw new Error(
        "deviceKeyPub, encryptedMasterKey, encryptedKeyShareKeys is not found",
      );
    }
    const deviceKey: deviceKey = {
      public: deviceKeyPub.deviceKey,
      private: deviceKeyPrivate,
      hashHex: await generateKeyHashHex(deviceKeyPub.deviceKey.key),
    };
    const masterKeyString = await decryptDataDeviceKey(
      deviceKey,
      encryptedMasterKey.masterKey,
    );
    const keyShareKeysString = await Promise.all(
      encryptedKeyShareKeys.map(async (keyShareKey) => {
        return await decryptDataDeviceKey(deviceKey, keyShareKey.keyShareKey);
      }),
    );
    if (!masterKeyString || !keyShareKeysString) {
      throw new Error("masterKeyString or keyShareKeysString is not found");
    }
    const masterKey: MasterKey = JSON.parse(masterKeyString);
    const keyShareKeys: KeyShareKey[] = keyShareKeysString.map((keyShareKey) =>
      keyShareKey ? JSON.parse(keyShareKey) : null
    );
    const identityKeyAndAccountKeys = await Promise.all(
      keys.map(async (key) => {
        const cookie = document.cookie;
        const sessionid = cookie.split("sessionid=")[1].split(";")[0];
        if (
          !sessionid || sessionid !== key.identityKey.sessionid ||
          sessionid !== key.accountKey.sessionid
        ) {
          throw new Error("sessionid is not found");
        }
        const encryptedIdentityKey = key.identityKey;
        const encryptedAccountKey = key.accountKey;
        const keyShareKey = keyShareKeys.find((keyShareKey) =>
          keyShareKey.hashHex === encryptedIdentityKey.key.encryptedKeyHashHex
        );
        if (!keyShareKey) {
          throw new Error("keyShareKey is not found");
        }
        const identityKeyString = await decryptAndVerifyDataWithKeyShareKey(
          keyShareKey,
          encryptedIdentityKey.key,
          masterKey.public,
        );
        const accountKeyString = await decryptAndVerifyDataWithKeyShareKey(
          keyShareKey,
          encryptedAccountKey.key,
          masterKey.public,
        );
        if (!identityKeyString || !accountKeyString) {
          throw new Error("identityKeyString or accountKeyString is not found");
        }
        const identityKey: IdentityKey = JSON.parse(identityKeyString);
        const accountKey: AccountKey = JSON.parse(accountKeyString);
        return {
          identityKey,
          accountKey,
          hashHex: identityKey.hashHex,
          keyExpiration: identityKey.public.keyExpiration,
        };
      }),
    );
    if (
      !masterKey || !deviceKey || !keyShareKeys || !identityKeyAndAccountKeys
    ) {
      throw new Error(
        "masterKey, deviceKey, keyShareKeys, identityKeyAndAccountKeys is not found",
      );
    }
    return {
      masterKey,
      deviceKey,
      keyShareKeys,
      identityKeyAndAccountKeys,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
