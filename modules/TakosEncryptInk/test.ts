import generateRoomKeyPair from "./generate/RoomKey.ts";
import generateRoomKeyCommon from "./generate/RoomCommonKey.ts";
import {
  decriptRoomKeyTextData,
  enscriptRoomKeyTextData,
} from "./Enscript/RoomKey.ts";

/* roomKey */

const key1 = await generateRoomKeyPair();
const key2 = await generateRoomKeyPair();

const commonKey1 = await generateRoomKeyCommon(key1.privateKey, key2.publicKey);
const commonKey2 = await generateRoomKeyCommon(key2.privateKey, key1.publicKey);

const data = "Hello, World!";

const encryptedData = await enscriptRoomKeyTextData(data, commonKey1);
const decryptedData = await decriptRoomKeyTextData(
  encryptedData.encryptedData,
  commonKey2,
  encryptedData.iv,
);

console.log(decryptedData); // Hello, World!
