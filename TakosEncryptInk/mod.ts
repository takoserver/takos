import { isValidAccountPrivateKey, isValidAccountPublicKey } from "./lib/isValid.ts/accountKey.ts"
import {
  isValidmigrateKeyPrivate,
  isValidmigrateKeyPublic,
  isValidmigrateSignKeyPrivate,
  isValidmigrateSignKeyyPublic,
} from "./lib/isValid.ts/migrateKey.ts"
import { isValidMasterKeyPriv, isValidMasterKeyPub } from "./lib/isValid.ts/masterKey.ts"
import { isValidSign } from "./lib/isValid.ts/sign.ts"
import { isValidRoomKey } from "./lib/isValid.ts/roomKey.ts"
import { isValidIdentityPrivateKey, isValidIdentityPublicKey } from "./lib/isValid.ts/identityKey.ts"
import { isValidDeviceKey } from "./lib/isValid.ts/deviceKey.ts"
import {
  isValidKeyShareKeyPrivate,
  isValidKeyShareKeyPublic,
  isValidkeyShareSignKeyPrivate,
  isValidkeyShareSignKeyPublic,
} from "./lib/isValid.ts/keyShareKey.ts"

const isValid = {
  AccountPrivateKey: isValidAccountPrivateKey,
  AccountPublicKey: isValidAccountPublicKey,
  migrateSignKeyPrivate: isValidmigrateSignKeyPrivate,
  migrateSignKeyPublic: isValidmigrateSignKeyyPublic,
  migrateKeyPrivate: isValidmigrateKeyPrivate,
  migrateKeyPublic: isValidmigrateKeyPublic,
  MasterKeyPrivate: isValidMasterKeyPriv,
  MasterKeyPublic: isValidMasterKeyPub,
  Sign: isValidSign,
  RoomKey: isValidRoomKey,
  IdentityPrivateKey: isValidIdentityPrivateKey,
  IdentityPublicKey: isValidIdentityPublicKey,
  DeviceKey: isValidDeviceKey,
  KeyShareKeyPrivate: isValidKeyShareKeyPrivate,
  KeyShareKeyPublic: isValidKeyShareKeyPublic,
  keyShareSignKeyPrivate: isValidkeyShareSignKeyPrivate,
  keyShareSignKeyPublic: isValidkeyShareSignKeyPublic,
}

import { decryptDataRoomKey, encryptDataRoomKey } from "./lib/encrypt/roomKey.ts"
import { DecryptDataAccountKey, EncryptDataAccountKey } from "./lib/encrypt/accountKey.ts"
import { decryptDataDeviceKey, encryptDataDeviceKey } from "./lib/encrypt/deviceKey.ts"

const encrypt = {
  RoomKey: {
    encryptData: encryptDataRoomKey,
    decryptData: decryptDataRoomKey,
  },
  AccountKey: {
    encryptData: EncryptDataAccountKey,
    decryptData: DecryptDataAccountKey,
  },
  DeviceKey: {
    encryptData: encryptDataDeviceKey,
    decryptData: decryptDataDeviceKey,
  },
}

import { signDataMasterKey, verifyDataMasterKey } from "./lib/sign/signDataMasterKey.ts"
import { signDataIdentityKey, verifyDataIdentityKey } from "./lib/sign/signDataIdentityKey.ts"
import { signDataKeyShareKey, verifyDataKeyShareKey } from "./lib/sign/signDataKeyShareSignKey.ts"
import { signDataMigrateSignKey, verifyDataMigrateSignKey } from "./lib/sign/signDataMigrateSignKey.ts"

const sign = {
  MasterKey: {
    signData: signDataMasterKey,
    verifyData: verifyDataMasterKey,
  },
  IdentityKey: {
    signData: signDataIdentityKey,
    verifyData: verifyDataIdentityKey,
  },
  KeyShareKey: {
    signData: signDataKeyShareKey,
    verifyData: verifyDataKeyShareKey,
  },
  migrateSignKey: {
    signData: signDataMigrateSignKey,
    verifyData: verifyDataMigrateSignKey,
  },
}

import { DecryptMessage, EncryptMessage } from "./lib/message.ts"

const message = {
  Decrypt: DecryptMessage,
  Encrypt: EncryptMessage,
}

export { encrypt, isValid, message, sign }
