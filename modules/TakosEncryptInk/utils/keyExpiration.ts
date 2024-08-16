// 鍵の期限が切れていないか確認する
import {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  Sign,
} from "../types.ts";

import { verifyMasterKey } from "../keys/masterKey.ts";
import { verifyIdentityKey } from "../keys/identityKey.ts";
import { importKey } from "../import.ts";
import { decodeBase64 } from "../keys/base64.ts";

export async function isKeyExpiration(
  key: accountKeyPub | identityKeyPub,
  masterKeys: OtherUserMasterKeys,
): Promise<{
  status: boolean;
  message?: string;
}> {
  const keyExpiration = new Date(key.keyExpiration);
  const now = new Date();
  if (keyExpiration < now) {
    return {
      status: false,
      message: "Key is expired",
    };
  }
  const keyExpirationSign = key.keyExpirationSign;
  const signature = keyExpirationSign.signature;
  const hashedPublicKeyHex = keyExpirationSign.hashedPublicKeyHex;
  const type = keyExpirationSign.type;
  if (type !== "master") {
    return {
      status: false,
      message: "Invalid type",
    };
  }
  if (key.keyType === "identityPub") {
    const masterKey = masterKeys.find((masterKey) =>
      masterKey.hashHex === hashedPublicKeyHex
    );
    if (!masterKey) {
      return {
        status: false,
        message: "Master key not found",
      };
    }
    const importedKey = await importKey(key);
    return {
      status: await verifyMasterKey(
        importedKey,
        new TextEncoder().encode(JSON.stringify(key.key)),
        decodeBase64(signature),
      ),
    };
  }
  if (key.keyType === "accountPub") {
    const masterKey = masterKeys.find((masterKey) =>
      masterKey.hashHex === hashedPublicKeyHex
    );
    if (!masterKey) {
      return {
        status: false,
        message: "Master key not found",
      };
    }
    const importedKey = await importKey(key);
    return {
      status: await verifyIdentityKey(
        importedKey,
        new TextEncoder().encode(JSON.stringify(key.key)),
        decodeBase64(signature),
      ),
    };
  }
  return {
    status: false,
    message: "Invalid keyType",
  };
}
