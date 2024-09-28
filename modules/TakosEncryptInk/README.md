# takos用の暗号化モジュール

## example

```ts
import {
createDeviceKey,
  createIdentityKeyAndAccountKey,
  createKeyShareKey,
  createMasterKey,
  createRoomKey,
  decryptDataDeviceKey,
  decryptDataWithAccountKey,
  encryptDataDeviceKey,
  encryptWithAccountKey,
  isValidAccountKey,
  isValidDeviceKey,
  isValidIdentityKeySign,
  isValidKeyShareKey,
  isValidMasterKeyTimeStamp,
  isValidRoomKey,
  encryptAndSignDataWithKeyShareKey,
  decryptAndVerifyDataWithKeyShareKey,
  encryptDataWithMigrateKey,
  generateMigrateDataSignKey,
  signDataWithMigrateDataSignKey,
  verifyDataWithMigrateDataSignKey,
  decryptDataWithMigrateKey,
  generateMigrateKey,
  encryptDataRoomKey,
  decryptDataRoomKey,
  encryptMessage,
  verifyAndDecryptMessage,
  signData,
  verifyData,
} from "./main.ts"
import type { Message } from "./types.ts"

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

console.log(await decryptAndVerifyDataWithKeyShareKey(keyShareKey, encryptedDataKeyShareKeyTest, masterKey.public))

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

console.log(verifyDataWithMigrateDataSignKey(migrateSignKey.public, encryptedDataMigrateKeyTest, encryptedDataMigrateKeyTestSign))

const decryptedDataMigrateKeyTest = await decryptDataWithMigrateKey(
  migrateKey,
  encryptedDataMigrateKeyTest,
)

console.log(SeacretText === decryptedDataMigrateKeyTest)

const encryptedDataRoomKey = await encryptDataRoomKey(
  roomKey,
  SeacretText,
)

console.log(SeacretText === await decryptDataRoomKey(
  roomKey,
  encryptedDataRoomKey,
))

const message: Message = {
  message: "Hello, World!",
  type: "text",
  version: 1,
}

const encryptedMessage = await encryptMessage(
  roomKey,
  identityKeyAndAccountKey.identityKey,
  message,
)

console.log(await verifyAndDecryptMessage(
  roomKey,
  identityKeyAndAccountKey.identityKey.public,
  encryptedMessage,
))

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


```
