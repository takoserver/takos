import generateRoomKeyCommon from "./generate/RoomCommonKey.ts"
import { areKeysEqual } from "./getHashKey.ts"
import generateKeyPair from "./generate/RoomKey.ts"
import { exportKeyToPem } from "./ExportKey.ts"
import { importKeyFromPem } from "./importKey.ts"
import { decriptRoomKeyTextData, enscriptRoomKeyTextData } from "./Enscript/RoomKey.ts"
import generateAccountKey from "./generate/AccountKey.ts"
/* 鍵のpemから */
const keyPaire1 = await generateKeyPair()
const keyPaire2 = await generateKeyPair()
const key1 = await generateRoomKeyCommon(
  keyPaire1.privateKey,
  keyPaire2.publicKey,
)
const pem1 = await exportKeyToPem(key1, "roomKey", "common")
const pem2 = await exportKeyToPem(keyPaire1.privateKey, "roomKey", "private")
const pem3 = await exportKeyToPem(keyPaire1.publicKey, "roomKey", "publicKey")
const key1_ = await importKeyFromPem(pem1, "roomKey", "common")
const text = "Hello, world!"
const enscriptedData = await enscriptRoomKeyTextData(text, key1)
const decriptedData = await decriptRoomKeyTextData(
  enscriptedData.encryptedData,
  key1_,
  enscriptedData.iv,
)
console.log(decriptedData)
// 共通鍵のimport/exportのテスト
console.log(await areKeysEqual(key1, key1_, "raw"))
// 秘密鍵("ECDH")のimport/exportのテスト
console.log(
  await areKeysEqual(
    keyPaire1.privateKey,
    await importKeyFromPem(pem2, "roomKey", "private"),
    "pkcs8",
  ),
)
// 公開鍵("ECDH")のimport/exportのテスト
console.log(
  await areKeysEqual(
    keyPaire1.publicKey,
    await importKeyFromPem(pem3, "roomKey", "publicKey"),
    "spki",
  ),
)

const accountKey = await generateAccountKey()
const pem4 = await exportKeyToPem(accountKey.sign.privateKey, "accountSignKey", "private")
const pem5 = await exportKeyToPem(accountKey.sign.publicKey, "accountSignKey", "publicKey")
const pem6 = await exportKeyToPem(accountKey.encript.privateKey, "accountEnscriptKey", "private")
const pem7 = await exportKeyToPem(accountKey.encript.publicKey, "accountEnscriptKey", "publicKey")
// 秘密鍵("RSA-PSS")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.sign.privateKey,
    await importKeyFromPem(pem4, "accountSignKey", "private"),
    "pkcs8",
  ),
)
// 公開鍵("RSA-PSS")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.sign.publicKey,
    await importKeyFromPem(pem5, "accountSignKey", "publicKey"),
    "spki",
  ),
)
// 秘密鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.encript.privateKey,
    await importKeyFromPem(pem6, "accountEnscriptKey", "private"),
    "pkcs8",
  ),
)
// 公開鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.encript.publicKey,
    await importKeyFromPem(pem7, "accountEnscriptKey", "publicKey"),
    "spki",
  ),
)

import generateDeviceKey from "./generate/DeviceKey.ts"
const deviceKey = await generateDeviceKey()

const pem8 = await exportKeyToPem(deviceKey.privateKey, "deviceKey", "private")
const pem9 = await exportKeyToPem(deviceKey.publicKey, "deviceKey", "publicKey")
// 秘密鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    deviceKey.privateKey,
    await importKeyFromPem(pem8, "deviceKey", "private"),
    "pkcs8",
  ),
)
// 公開鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    deviceKey.publicKey,
    await importKeyFromPem(pem9, "deviceKey", "publicKey"),
    "spki",
  ),
)

/* 暗号化テスト */