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
import { generateMasterKey } from "./keys/masterKey.ts";

const masterKey = await generateMasterKey();
const demoAccountKey = await generateAccountKey(
  masterKey.publicKey,
  masterKey.privateKey,
);
const demoIdentityKey = await generateIdentityKey();
