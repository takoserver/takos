import generateRoomKeyCommon from "./generate/RoomCommonKey.ts";
import { areKeysEqual } from "./getHashKey.ts";
import generateKeyPair from "./generate/RoomKey.ts";
import { exportKeyToPem } from "./ExportKey.ts";
import { importKeyFromPem } from "./importKey.ts";
import {
  decriptRoomKeyTextData,
  enscriptRoomKeyTextData,
} from "./Enscript/RoomKey.ts";
const keyPaire1 = await generateKeyPair();
const keyPaire2 = await generateKeyPair();
const key1 = await generateRoomKeyCommon(
  keyPaire1.privateKey,
  keyPaire2.publicKey,
);
const pem1 = await exportKeyToPem(key1, "roomKey", "common");
const pem2 = await exportKeyToPem(keyPaire1.privateKey, "roomKey", "private");
const key1_ = await importKeyFromPem(pem1, "roomKey", "common");
const text = "Hello, world!";
const enscriptedData = await enscriptRoomKeyTextData(text, key1);
const decriptedData = await decriptRoomKeyTextData(
  enscriptedData.encryptedData,
  key1_,
  enscriptedData.iv,
);
console.log(decriptedData);
areKeysEqual(key1, key1_);
const key2_ = await importKeyFromPem(pem2, "roomKey", "private");
areKeysEqual(
  keyPaire2.privateKey,
  key2_,
);
