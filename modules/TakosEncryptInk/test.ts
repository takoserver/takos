import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  createRoomKey,
  encryptMessage,
  isValidAccountKey,
  isValidIdentityKeySign,
  signData,
  verifyAndDecryptMessage,
  verifyData,
} from "jsr:@takos/takos-encrypt-ink@^1.0.2"

const masterKey = await createMasterKey()
const { identityKey, accountKey } = await createIdentityKeyAndAccountKey(masterKey)

const verify = await isValidIdentityKeySign(masterKey.public, identityKey.public)

console.log(verify)

const verify2 = await isValidAccountKey(identityKey.public, accountKey.public)

console.log(verify2)