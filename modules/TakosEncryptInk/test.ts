import { hash } from "../../../../../AppData/Local/deno/npm/registry.npmjs.org/@noble/hashes/1.4.0/_assert.d.ts"
import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createKeyShareKey,
  createMasterKey,
  createRoomKey,
  decryptAndVerifyDataWithKeyShareKey,
  decryptDataDeviceKey,
  decryptDataRoomKey,
  decryptDataWithAccountKey,
  decryptDataWithMigrateKey,
  encryptAndSignDataWithKeyShareKey,
  encryptDataDeviceKey,
  encryptDataRoomKey,
  encryptDataWithMigrateKey,
  encryptMessage,
  encryptWithAccountKey,
  generateMigrateDataSignKey,
  generateMigrateKey,
  isValidAccountKey,
  isValidDeviceKey,
  isValidIdentityKeySign,
  isValidKeyShareKey,
  isValidMasterKeyTimeStamp,
  isValidRoomKey,
  signData,
  signDataWithMigrateDataSignKey,
  verifyAndDecryptMessage,
  verifyData,
  verifyDataWithMigrateDataSignKey,
} from "./main.ts"
import type { Message } from "./types.ts"

const masterKey = await createMasterKey()
const identityKeyAndAccountKey = await createIdentityKeyAndAccountKey(masterKey)
const roomKey = await createRoomKey(identityKeyAndAccountKey.identityKey)

const aeskey = await crypto.subtle.generateKey(
  {
    name: "AES-GCM",
    length: 256,
  },
  true,
  ["encrypt", "decrypt"],
)
const raw = await crypto.subtle.exportKey("raw", aeskey)
const encryptedRoomKey = await encryptWithAccountKey(
  identityKeyAndAccountKey.accountKey.public,
  JSON.stringify(roomKey),
)
console.log(new Uint8Array(raw).length)

const nosignRoomKey = {
  roomKey: roomKey.key,
  timestamp: roomKey.timestamp,
  keyExpiration: roomKey.keyExpiration,
  hashHex: roomKey.hashHex,
  version: roomKey.version,
  keyType: roomKey.keyType,
}
console.log((new TextEncoder()).encode(JSON.stringify(nosignRoomKey)).length / 1000 + "KB")
console.log((new TextEncoder()).encode(JSON.stringify(encryptedRoomKey)).length / 1000 + "KB")
/*
const masterKey = await createMasterKey()
const verifyTimestamp = isValidMasterKeyTimeStamp(masterKey.public)

console.log(verifyTimestamp)

const identityKeyAndAccountKey = await createIdentityKeyAndAccountKey(masterKey)

const verifyIdentityKey = isValidIdentityKeySign(
  masterKey.public,
  identityKeyAndAccountKey.identityKey.public,
)

console.log(verifyIdentityKey)

const verifyAccountKey = isValidAccountKey(
  identityKeyAndAccountKey.identityKey.public,
  identityKeyAndAccountKey.accountKey.public,
)

console.log(verifyAccountKey)

const roomKey = await createRoomKey(identityKeyAndAccountKey.identityKey)
const verifyRoomkey = isValidRoomKey(
  identityKeyAndAccountKey.identityKey.public,
  roomKey,
)

console.log(verifyRoomkey)

const SeacretText = "Hello, World!"

const encryptedDataAccountKeyTest = await encryptWithAccountKey(
  identityKeyAndAccountKey.accountKey.public,
  SeacretText,
)

const decryptedDataAccountKeyTest = await decryptDataWithAccountKey(
  identityKeyAndAccountKey.accountKey,
  encryptedDataAccountKeyTest,
)

console.log(SeacretText === decryptedDataAccountKeyTest)

const deviceKeys = await createDeviceKey(masterKey)

console.log(isValidDeviceKey(masterKey.public, deviceKeys.public))

const encryptedDataDeviceKeyTest = await encryptDataDeviceKey(
  deviceKeys,
  SeacretText,
)

const decryptedDataDeviceKeyTest = await decryptDataDeviceKey(
  deviceKeys,
  encryptedDataDeviceKeyTest,
)

console.log(SeacretText === decryptedDataDeviceKeyTest)

const keyShareKey = await createKeyShareKey(masterKey)

console.log(isValidKeyShareKey(masterKey.public, keyShareKey.public))

const encryptedDataKeyShareKeyTest = await encryptAndSignDataWithKeyShareKey(
  keyShareKey,
  SeacretText,
  masterKey,
)

console.log(
  await decryptAndVerifyDataWithKeyShareKey(
    keyShareKey,
    encryptedDataKeyShareKeyTest,
    masterKey.public,
  ),
)

const migrateKey = await generateMigrateKey()
const migrateSignKey = await generateMigrateDataSignKey()

const encryptedDataMigrateKeyTest = await encryptDataWithMigrateKey(
  migrateKey.public,
  SeacretText,
)

const encryptedDataMigrateKeyTestSign = signDataWithMigrateDataSignKey(
  migrateSignKey,
  encryptedDataMigrateKeyTest,
)

console.log(
  verifyDataWithMigrateDataSignKey(
    migrateSignKey.public,
    encryptedDataMigrateKeyTest,
    encryptedDataMigrateKeyTestSign,
  ),
)

const decryptedDataMigrateKeyTest = await decryptDataWithMigrateKey(
  migrateKey,
  encryptedDataMigrateKeyTest,
)

console.log(SeacretText === decryptedDataMigrateKeyTest)

const encryptedDataRoomKey = await encryptDataRoomKey(
  roomKey,
  SeacretText,
)

console.log(
  SeacretText === await decryptDataRoomKey(
    roomKey,
    encryptedDataRoomKey,
  ),
)

const message: Message = {
  message: "Hello, World!",
  type: "text",
  version: 1,
  timestamp: new Date().toISOString(),
}

const encryptedMessage = await encryptMessage(
  roomKey,
  identityKeyAndAccountKey.identityKey,
  message,
)

console.log(
  await verifyAndDecryptMessage(
    roomKey,
    identityKeyAndAccountKey.identityKey.public,
    encryptedMessage,
  ),
)

const signedData = signData(
  identityKeyAndAccountKey.identityKey,
  SeacretText,
)

const verifySignedData = verifyData(
  identityKeyAndAccountKey.identityKey.public,
  SeacretText,
  signedData,
)

console.log(verifySignedData)
*/