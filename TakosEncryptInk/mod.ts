import {
  decryptDataAESGCMs,
  decryptDataMlKems,
  encryptDataMlKems,
  signEncryptedData,
  verifyEncryptedData,
} from "./lib/encryptData.ts"
import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createKeyShareKey,
  createKeyShareSignKey,
  createMasterKey,
  createMigrateDataSignKey,
  createMigrateKey,
  createRoomKey,
} from "./lib/generates.ts"
import { hashHexKey } from "./utils/hashHexKey.ts"
import { decryptMessage, encryptMessage, processedNotEncryptMessage } from "./lib/EncryptMessage.ts"
export const generate = {
  createMasterKey,
  createIdentityKeyAndAccountKey,
  createRoomKey,
  createKeyShareKey,
  createKeyShareSignKey,
  createDeviceKey,
  createMigrateDataSignKey,
  createMigrateKey,
}

export const encryptData = {
  encryptDataMlKems,
  signEncryptedData,
  decryptDataMlKems,
  decryptDataAESGCMs,
  verifyEncryptedData,
}

export const EncryptMessage = {
  encryptMessage,
  decryptMessage,
  processedNotEncryptMessage,
}

export { hashHexKey }
