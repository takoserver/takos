import type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
} from "./types.ts"
import { generateAccountKey, signAccountKey, verifyAccountKey } from "./keys/accountKey.ts"
import { generateIdentityKey, signIdentityKey, verifyIdentityKey } from "./keys/identityKey.ts"
import { decryptRoomKey, encryptRoomKey, generateRoomKey } from "./keys/roomKey.ts"

import { generateMasterKey, signMasterKey, verifyMasterKey } from "./keys/masterKey.ts"
import { decodeBase64, encodeBase64 } from "./keys/base64.ts"
import { digestMessage } from "./utils/hash.ts"
import { exportfromJWK, importKey } from "./import.ts"

export {
  decodeBase64,
  decryptRoomKey,
  digestMessage,
  encodeBase64,
  encryptRoomKey,
  exportfromJWK,
  generateAccountKey,
  generateIdentityKey,
  generateMasterKey,
  generateRoomKey,
  importKey,
  signAccountKey,
  signIdentityKey,
  signMasterKey,
  verifyAccountKey,
  verifyIdentityKey,
  verifyMasterKey,
}
export type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
}
