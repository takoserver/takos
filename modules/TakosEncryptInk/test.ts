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
  decryptAndVerifyDataWithRoomKey
} from "./main.ts"

const master = await createMasterKey();
const keys = await createIdentityKeyAndAccountKey(master);
const identityKey = keys.identityKey;
const accountKey = keys.accountKey;
const deviceKey = await createDeviceKey(master);
const roomKey = await createRoomKey(identityKey);

let data: string = "";
for (let i = 0; i < 10000; i++) {
  data += "test"
}

// test device key encryption
const encryptedData = await encryptDataDeviceKey(deviceKey, data);
const decryptedData = await decryptDataDeviceKey(deviceKey, encryptedData);
console.log(decryptedData);

// test room key encryption
const encryptedDataRoomKey = await encryptAndSignDataWithRoomKey(roomKey, data, identityKey);
const decryptedDataRoomKey = await decryptAndVerifyDataWithRoomKey(roomKey, encryptedDataRoomKey, identityKey.public);
console.log(decryptedDataRoomKey);

// test account key encryption
const masterKey2 = await createMasterKey();
const keys2 = await createIdentityKeyAndAccountKey(masterKey2);
const identityKey2 = keys2.identityKey;
const accountKey2 = keys2.accountKey;
const encryptedDataAccountKey = await encryptAndSignDataWithAccountKey(accountKey2.public, data, identityKey)
const decryptedDataAccountKey = await decryptAndVerifyDataWithAccountKey(accountKey2, encryptedDataAccountKey, identityKey.public);
console.log(decryptedDataAccountKey);