import generateRoomKeyCommon from "./generate/RoomCommonKey.ts";
import { areKeysEqual } from "./getHashKey.ts";
import generateKeyPair from "./generate/RoomKey.ts";
import { exportKeyToPem } from "./ExportKey.ts";
import { importKeyFromPem } from "./importKey.ts";
import {
  decryptRoomKeyTextData,
  encryptRoomKeyTextData,
} from "./Enscript/RoomKey.ts";
import generateAccountKey from "./generate/AccountKey.ts";
import { signAccountKey, verifyAccountKey } from "./Enscript/AccountKey.ts";
import { decriptDeviceKey, enscriptDeviceKey } from "./Enscript/DeviceKey.ts";
import generateDeviceKey from "./generate/DeviceKey.ts";

/* 鍵のpemから */
const keyPaire1 = await generateKeyPair();
const keyPaire2 = await generateKeyPair();
const key1 = await generateRoomKeyCommon(
  keyPaire1.privateKey,
  keyPaire2.publicKey,
);
const pem1 = await exportKeyToPem(key1, "roomKey", "common");
const pem2 = await exportKeyToPem(keyPaire1.privateKey, "roomKey", "private");
const pem3 = await exportKeyToPem(keyPaire1.publicKey, "roomKey", "publicKey");
const key1_ = await importKeyFromPem(pem1, "roomKey", "common");
const text = "Hello, world!";
const enscriptedData = await encryptRoomKeyTextData(text, key1);
const decriptedData = await decryptRoomKeyTextData(
  enscriptedData.encryptedData,
  key1_,
  enscriptedData.iv,
);
console.log(decriptedData);
// 共通鍵のimport/exportのテスト
console.log(await areKeysEqual(key1, key1_, "raw"));
// 秘密鍵("ECDH")のimport/exportのテスト
console.log(
  await areKeysEqual(
    keyPaire1.privateKey,
    await importKeyFromPem(pem2, "roomKey", "private"),
    "pkcs8",
  ),
);
// 公開鍵("ECDH")のimport/exportのテスト
console.log(
  await areKeysEqual(
    keyPaire1.publicKey,
    await importKeyFromPem(pem3, "roomKey", "publicKey"),
    "spki",
  ),
);

const accountKey = await generateAccountKey();
const pem4 = await exportKeyToPem(
  accountKey.privateKey,
  "accountKey",
  "private",
);
const pem5 = await exportKeyToPem(
  accountKey.publicKey,
  "accountKey",
  "publicKey",
);
// 秘密鍵("RSA-PSS")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.privateKey,
    await importKeyFromPem(pem4, "accountKey", "private"),
    "pkcs8",
  ),
);
// 公開鍵("RSA-PSS")のimport/exportのテスト
console.log(
  await areKeysEqual(
    accountKey.publicKey,
    await importKeyFromPem(pem5, "accountKey", "publicKey"),
    "spki",
  ),
);
const deviceKey = await generateDeviceKey();

const pem8 = await exportKeyToPem(deviceKey.privateKey, "deviceKey", "private");
const pem9 = await exportKeyToPem(
  deviceKey.publicKey,
  "deviceKey",
  "publicKey",
);
// 秘密鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    deviceKey.privateKey,
    await importKeyFromPem(pem8, "deviceKey", "private"),
    "pkcs8",
  ),
);
// 公開鍵("RSA-OAEP")のimport/exportのテスト
console.log(
  await areKeysEqual(
    deviceKey.publicKey,
    await importKeyFromPem(pem9, "deviceKey", "publicKey"),
    "spki",
  ),
);

/* 暗号化テスト */

//account_key
async function main() {
  const accountKey = await generateAccountKey();
  const signPrivateKey = accountKey.privateKey;
  const signPublicKey = accountKey.publicKey;

  const data = "Sensitive account data";

  // データの署名
  const signature = await signAccountKey(data, signPrivateKey);
  //console.log("Signature:", signature)

  // 署名の検証
  const isVerified = await verifyAccountKey(data, signPublicKey, signature);
  console.log("Verified:", isVerified);
}

main().catch(console.error);

//room_key

async function main2() {
  const keyPair1 = await generateKeyPair();
  const keyPair2 = await generateKeyPair();
  const roomKey = await generateRoomKeyCommon(
    keyPair1.privateKey,
    keyPair2.publicKey,
  );
  const roomKey2 = await generateRoomKeyCommon(
    keyPair2.privateKey,
    keyPair1.publicKey,
  );

  const data = "Sensitive room data";

  // データの暗号化
  const encryptedData = await encryptRoomKeyTextData(data, roomKey);
  const deencryptedData = await decryptRoomKeyTextData(
    encryptedData.encryptedData,
    roomKey2,
    encryptedData.iv,
  );
  console.log("Decrypted Data:", deencryptedData);
}

main2().catch(console.error);

async function main3() {
  const deviceKey = await generateDeviceKey();
  const data = "Sensitive device data";
  const encryptedData = await enscriptDeviceKey(data, deviceKey.publicKey);
  const decryptedData = await decriptDeviceKey(
    encryptedData,
    deviceKey.privateKey,
  );
  console.log("Decrypted Data:", decryptedData);
}

main3().catch(console.error);
