import { generateMasterKey } from "../lib/generate/masterKey.ts";
import {
  signDataMasterKey,
  verifyDataMasterKey,
} from "../lib/sign/signDataMasterKey.ts";
import {
  signDataIdentityKey,
  verifyDataIdentityKey,
} from "../lib/sign/signDataIdentityKey.ts";
import { generateIdentityKeyAndAccountKey } from "../lib/generate/IdentityKeyAndAccountKey.ts";
import {
  DecryptDataAccountKey,
  EncryptDataAccountKey,
} from "../lib/encrypt/accountKey.ts";
import { generateRoomKey } from "../lib/generate/roomKey.ts";
import type { IdentityKeyPrivateObject } from "../types/keys.ts";
import { base64ToArrayBuffer } from "../utils/buffers.ts";
import { generateKeyShareKeys } from "../lib/generate/keyShareKey.ts";
import {
  isValidKeyShareKeyPublic,
  isValidkeyShareSignKeyPublic,
} from "../lib/isValid.ts/keyShareKey.ts";

async function createUserKeys() {
  const masterkeys = generateMasterKey();
  const identityAndAccountKeys = await generateIdentityKeyAndAccountKey(
    masterkeys,
  );
  return {
    masterkeys,
    identityAndAccountKeys,
  };
}

const bobKeys = await createUserKeys();
const aliceKeys = await createUserKeys();

const idenPrivate = new Uint8Array(
  base64ToArrayBuffer(
    (JSON.parse(
      aliceKeys.identityAndAccountKeys.identityKey.private,
    ) as IdentityKeyPrivateObject).key,
  ),
);

console.log(idenPrivate.length);

const roomKey = await generateRoomKey(
  {
    publicKey: aliceKeys.identityAndAccountKeys.identityKey.public,
    secretKey: aliceKeys.identityAndAccountKeys.identityKey.private,
  },
  [
    {
      masterKey: bobKeys.masterkeys.public,
      identityKey: {
        public: bobKeys.identityAndAccountKeys.identityKey.public,
        sign: bobKeys.identityAndAccountKeys.identityKey.sign,
      },
      accountKey: {
        public: bobKeys.identityAndAccountKeys.accountKey.public,
        sign: bobKeys.identityAndAccountKeys.accountKey.sign,
      },
      userId: "bob",
    },
  ],
  [{
    hash: "hash",
    userId: "bob",
    timestamp: new Date(new Date().getTime() - 1000).toISOString(),
  }],
  [{
    timestamp: new Date(new Date().getTime() - 1000).toISOString(),
    userId: "bob",
  }],
);

//console.log(roomKey)
