import type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
} from "./types.ts";
import {
  generateAccountKey,
  signAccountKey,
  verifyAccountKey,
} from "./keys/accountKey.ts";
import {
  generateIdentityKey,
  signIdentityKey,
  verifyIdentityKey,
} from "./keys/identityKey.ts";
import {
  decryptRoomKey,
  encryptRoomKey,
  generateRoomKey,
} from "./keys/roomKey.ts";

import { generateMasterKey, signMasterKey, verifyMasterKey } from "./keys/masterKey.ts";
import { encodeBase64, decodeBase64} from "./keys/base64.ts";
import { digestMessage } from "./utils/hash.ts";
import { importKey, exportfromJWK } from "./import.ts";

export {
  decryptRoomKey,
  encryptRoomKey,
  generateAccountKey,
  generateIdentityKey,
  generateRoomKey,
  signAccountKey,
  signIdentityKey,
  verifyAccountKey,
  verifyIdentityKey,
    generateMasterKey,
    signMasterKey,
    verifyMasterKey,
    encodeBase64,
    decodeBase64,
    digestMessage,
    importKey,
    exportfromJWK,
};
export type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
};
