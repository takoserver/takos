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
import {
  decriptAccountData,
  enscriptAccountData,
  signAccountKey,
  verifyAccountKey,
} from "./Enscript/AccountKey.ts";
import { decriptDeviceKey, enscriptDeviceKey } from "./Enscript/DeviceKey.ts";
import generateDeviceKey from "./generate/DeviceKey.ts";
import { ArrayBuffertoBase64, base64ToArrayBuffer } from "./base.ts";

export default {
  accountKey: {
    generate: generateAccountKey,
    sign: signAccountKey,
    verify: verifyAccountKey,
    enscriptData: enscriptAccountData,
    decriptData: decriptAccountData,
  },
  roomKey: {
    generate: generateKeyPair,
    generateCommon: generateRoomKeyCommon,
    encryptTextData: encryptRoomKeyTextData,
    decryptTextData: decryptRoomKeyTextData,
  },
  deviceKey: {
    generate: generateDeviceKey,
    enscript: enscriptDeviceKey,
    descript: decriptDeviceKey,
  },
  importKeyFromPem,
  exportKeyToPem,
  areKeysEqual,
  base64ToArrayBuffer,
  ArrayBuffertoBase64,
};
