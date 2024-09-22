import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  createRoomKey,
  encryptMessage,
  isValidAccountKey,
  isValidIdentityKeySign,
  isValidMasterKeyTimeStamp,
  signData,
  verifyAndDecryptMessage,
  verifyData,
} from "./main.ts"

const masterKey = await createMasterKey()
const verify = await isValidMasterKeyTimeStamp(masterKey.public)

console.log(verify)