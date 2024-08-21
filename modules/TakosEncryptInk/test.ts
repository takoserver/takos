import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createMasterKey,
  encryptDataDeviceKey,
  decryptDataDeviceKey,
  createRoomKey,
  encryptAndSignDataWithAccountKey,
  decryptAndVerifyDataWithAccountKey,
  encryptAndSignDataWithRoomKey,
  decryptAndVerifyDataWithRoomKey,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from "./main.ts"

const master = await createMasterKey();
const keys = await createIdentityKeyAndAccountKey(master);
const identityKey = keys.identityKey;
const accountKey = keys.accountKey;
const roomKey = await createRoomKey(identityKey);

