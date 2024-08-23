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
}
