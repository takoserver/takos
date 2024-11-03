import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../../utils/buffers.ts";
import { sign, verify } from "../../utils/sign.ts";
import type {
  IdentityKeyPrivateObject,
  roomKeyObject,
} from "../../types/keys.ts";
import type { MasterKeyPublicObject } from "../../types/keys.ts";
import { isValidMasterKeyPub } from "../isValid.ts/masterKey.ts";
import type { IdentityKeyPublicObject } from "../../types/keys.ts";
import { isValidIdentityPublicKey } from "../isValid.ts/identityKey.ts";
import { isValidAccountPublicKey } from "../isValid.ts/accountKey.ts";
import { verifyDataMasterKey } from "../sign/signDataMasterKey.ts";
import { verifyDataIdentityKey } from "../sign/signDataIdentityKey.ts";
import { keyHash } from "../../utils/keyHash.ts";
import { EncryptDataAccountKey } from "../encrypt/accountKey.ts";

export async function generateRoomKey(
  idenKey: {
    publicKey: string;
    secretKey: string;
  },
  keys: {
    masterKey: string;
    identityKey: {
      public: string;
      sign: string;
    };
    accountKey: {
      public: string;
      sign: string;
    };
    userId: string;
  }[],
  creditMasterKeys: {
    hash: string;
    userId: string;
    timestamp: string;
  }[],
  latestIdentityKeyTimestamps: {
    timestamp: string;
    userId: string;
  }[],
): Promise<{
  roomKey: string;
  sign: string;
  encryptedRoomKeys: {
    userId: string;
    encryptedRoomKey: string;
  }[];
  updatedCreditMasterKey: {
    hash: string;
    userId: string;
    timestamp: string;
  }[];
  updatedLatestIdentityKeyTimestamp: {
    timestamp: string;
    userId: string;
  }[];
}> {
  const encryptedMasterKeys: {
    userId: string;
    masterKeyHash: string;
  }[] = [];
  const updatedCreditMasterKeys: {
    hash: string;
    userId: string;
    timestamp: string;
  }[] = [];
  const updatedLatestIdentityKeyTimestamps: {
    timestamp: string;
    userId: string;
  }[] = [];
  for (const key of keys) {
    if (!isValidMasterKeyPub(key.masterKey)) {
      throw new Error("Invalid Master Key");
    }
    if (!isValidIdentityPublicKey(key.identityKey.public)) {
      throw new Error("Invalid Identity Key");
    }
    if (!isValidAccountPublicKey(key.accountKey.public)) {
      throw new Error("Invalid Account Key");
    }
    if (
      !verifyDataMasterKey(
        key.identityKey.public,
        key.masterKey,
        key.identityKey.sign,
      )
    ) {
      throw new Error("Invalid Sign");
    }
    if (
      !verifyDataIdentityKey(
        key.accountKey.public,
        key.identityKey.public,
        key.accountKey.sign,
      )
    ) {
      throw new Error("Invalid Sign");
    }
    const idenKeyKey: IdentityKeyPublicObject = JSON.parse(
      key.identityKey.public,
    );
    const masterKey: MasterKeyPublicObject = JSON.parse(key.masterKey);
    for (const latestIdentityKeyTimestamp of latestIdentityKeyTimestamps) {
      if (latestIdentityKeyTimestamp.userId === key.userId) {
        if (
          new Date(latestIdentityKeyTimestamp.timestamp) >
            new Date(idenKeyKey.timestamp)
        ) {
          throw new Error("Invalid Identity Key");
        }
        if (
          new Date(latestIdentityKeyTimestamp.timestamp) <
            new Date(idenKeyKey.timestamp)
        ) {
          updatedLatestIdentityKeyTimestamps.push({
            timestamp: idenKeyKey.timestamp,
            userId: key.userId,
          });
        }
      }
    }
    const masterKeyHash = await keyHash(key.masterKey);
    for (const creditMasterKey of creditMasterKeys) {
      if (creditMasterKey.userId === key.userId) {
        if (creditMasterKey.hash !== masterKeyHash) {
          if (
            new Date(creditMasterKey.timestamp) > new Date(masterKey.timestamp)
          ) {
            throw new Error("Invalid Master Key");
          }
          updatedCreditMasterKeys.push({
            hash: masterKeyHash,
            userId: key.userId,
            timestamp: masterKey.timestamp,
          });
        }
      }
    }
    encryptedMasterKeys.push({
      userId: key.userId,
      masterKeyHash: masterKeyHash,
    });
  }
  const roomKeyRaw = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const roomKeyExport = await crypto.subtle.exportKey("raw", roomKeyRaw);
  const roomKeyString = arrayBufferToBase64(roomKeyExport);
  const timestamp = new Date().toISOString();
  const roomKeyObject: roomKeyObject = {
    key: roomKeyString,
    timestamp: timestamp,
    type: "roomKey",
    version: 1,
    masterKeysHashHex: {},
  };
  const roomKey = JSON.stringify(roomKeyObject);
  const signature = await sign({
    public: JSON.parse(idenKey.publicKey).key,
    private: JSON.parse(idenKey.secretKey).key,
  }, roomKey);
  const encryptedRoomKeys: {
    userId: string;
    encryptedRoomKey: string;
  }[] = [];
  for (const key of keys) {
    const encryptedRoomKey = await EncryptDataAccountKey(
      roomKey,
      key.accountKey.public,
    );
    encryptedRoomKeys.push({
      userId: key.userId,
      encryptedRoomKey: encryptedRoomKey,
    });
  }
  return {
    roomKey: JSON.stringify(roomKeyObject),
    sign: JSON.stringify(signature),
    encryptedRoomKeys: encryptedRoomKeys,
    updatedCreditMasterKey: updatedCreditMasterKeys,
    updatedLatestIdentityKeyTimestamp: updatedLatestIdentityKeyTimestamps,
  };
}
