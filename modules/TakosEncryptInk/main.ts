import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
  EncryptedData,
  EncryptedDataAccountKey,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  HashChainElement,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  KeyShareKey,
  KeyShareKeyPrivate,
  KeyShareKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  Message,
  migrateDataSignKey,
  migrateDataSignKeyPrivate,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPrivate,
  migrateKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  RoomKey,
  Sign,
} from "./types.ts"
export type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
  EncryptedData,
  EncryptedDataAccountKey,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  HashChainElement,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  KeyShareKey,
  KeyShareKeyPrivate,
  KeyShareKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  Message,
  migrateDataSignKey,
  migrateDataSignKeyPrivate,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPrivate,
  migrateKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  RoomKey,
  Sign,
}
import { decode, encode } from "base64-arraybuffer"
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return encode(buffer)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return decode(base64)
}

export async function createMasterKey(): Promise<MasterKey> {
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const aliceKeys = ml_dsa65.keygen(seed)
  const publicKeyString = arrayBufferToBase64(aliceKeys.publicKey)
  const privateKeyString = arrayBufferToBase64(aliceKeys.secretKey)
  const hashHex = await crypto.subtle.digest("SHA-256", aliceKeys.publicKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  const timestamp = new Date(Date.now()).toISOString()
  const sign = signTimestamp(timestamp, aliceKeys.secretKey)
  return {
    public: {
      key: publicKeyString,
      keyType: "masterPub",
      version: 1,
      timestamp,
      timestampSign: sign,
    },
    private: {
      key: privateKeyString,
      keyType: "masterPrivate",
      version: 1,
    },
    hashHex: hashHexString,
    version: 1,
  }
}

export function isValidMasterKeyTimeStamp(
  masterKey: MasterKeyPub,
): boolean {
  return verifyTimestamp(
    masterKey.timestamp,
    masterKey.timestampSign,
    new Uint8Array(base64ToArrayBuffer(masterKey.key)),
  )
}

export function sign(
  key: MasterKey | IdentityKey,
  data: ArrayBuffer,
  type: "master" | "identity",
): Sign {
  const keySeacretKey = new Uint8Array(base64ToArrayBuffer(key.private.key))
  const sign = ml_dsa65.sign(keySeacretKey, new Uint8Array(data))
  return {
    signature: arrayBufferToBase64(sign),
    hashedPublicKeyHex: key.hashHex,
    type,
    version: 1,
  }
}
export function verify(
  key: IdentityKeyPub | MasterKeyPub,
  data: ArrayBuffer,
  sign: Sign,
): boolean {
  const keyPublic = new Uint8Array(base64ToArrayBuffer(key.key))
  const signature = new Uint8Array(base64ToArrayBuffer(sign.signature))
  const isValid = ml_dsa65.verify(keyPublic, new Uint8Array(data), signature)
  return isValid
}

export function signTimestamp(
  time: string,
  key: Uint8Array,
): string {
  const sign = ml_dsa65.sign(key, new TextEncoder().encode(time))
  return arrayBufferToBase64(sign)
}

export function verifyTimestamp(
  time: string,
  sign: string,
  key: Uint8Array,
): boolean {
  const isValid = ml_dsa65.verify(
    key,
    new TextEncoder().encode(time),
    new Uint8Array(base64ToArrayBuffer(sign)),
  )
  return isValid
}

export async function createIdentityKeyAndAccountKey(
  masterKey: MasterKey,
): Promise<{ identityKey: IdentityKey; accountKey: AccountKey }> {
  const idenSeed = crypto.getRandomValues(new Uint8Array(32))
  const idenKeys = ml_dsa65.keygen(idenSeed)
  const idenPublicKeyString = arrayBufferToBase64(idenKeys.publicKey)
  const idenPrivateKeyString = arrayBufferToBase64(idenKeys.secretKey)
  const idenHashHex = await crypto.subtle.digest("SHA-256", idenKeys.publicKey)
  const idenHashHexString = arrayBufferToBase64(idenHashHex)
  const accountKeys = ml_kem768.keygen()
  const accountPublicKeyString = arrayBufferToBase64(accountKeys.publicKey)
  const accountPrivateKeyString = arrayBufferToBase64(accountKeys.secretKey)
  const accountHashHex = await crypto.subtle.digest("SHA-256", accountKeys.publicKey)
  const accountHashHexString = arrayBufferToBase64(accountHashHex)
  const timestamp = new Date(Date.now()).toISOString()
  const timestampSign = signTimestamp(timestamp, idenKeys.secretKey)
  const identityKeySign = sign(masterKey, idenKeys.publicKey, "master")
  const identityKeyPub: IdentityKeyPub = {
    key: idenPublicKeyString,
    sign: identityKeySign,
    timestamp,
    timestampSign,
    keyType: "identityPub",
    version: 1,
  }
  const identityKeyPrivate: IdentityKeyPrivate = {
    key: idenPrivateKeyString,
    keyType: "identityPrivate",
    version: 1,
  }
  const identityKey: IdentityKey = {
    public: identityKeyPub,
    private: identityKeyPrivate,
    hashHex: idenHashHexString,
    version: 1,
  }
  const accountKeySign = sign(identityKey, accountKeys.publicKey, "identity")
  const accountKeyPub: AccountKeyPub = {
    key: accountPublicKeyString,
    sign: accountKeySign,
    keyType: "accountPub",
    version: 1,
  }
  const accountKeyPrivate: AccountKeyPrivate = {
    key: accountPrivateKeyString,
    keyType: "accountPrivate",
    version: 1,
  }
  const accountKey: AccountKey = {
    public: accountKeyPub,
    private: accountKeyPrivate,
    hashHex: accountHashHexString,
    version: 1,
  }
  return { identityKey, accountKey }
}

export function isValidIdentityKeySign(
  masterKey: MasterKeyPub,
  identityKey: IdentityKeyPub,
): boolean {
  return verify(
    masterKey,
    new Uint8Array(base64ToArrayBuffer(identityKey.key)),
    identityKey.sign,
  ) &&
    verifyTimestamp(
      identityKey.timestamp,
      identityKey.timestampSign,
      new Uint8Array(base64ToArrayBuffer(identityKey.key)),
    )
}

export function isValidAccountKey(
  identityKey: IdentityKeyPub,
  accountKey: AccountKeyPub,
): boolean {
  return verify(identityKey, new Uint8Array(base64ToArrayBuffer(accountKey.key)), accountKey.sign)
}

export async function createDeviceKey(
  masterKey: MasterKey,
): Promise<deviceKey> {
  //create ml-kem keypair
  const keyPair = ml_kem768.keygen()
  const publicKeyString = arrayBufferToBase64(keyPair.publicKey)
  const privateKeyString = arrayBufferToBase64(keyPair.secretKey)
  const hashHex = await crypto.subtle.digest("SHA-256", keyPair.publicKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  const keySign = sign(masterKey, keyPair.publicKey, "master")
  const deviceKeyPub: deviceKeyPub = {
    key: publicKeyString,
    sign: keySign,
    keyType: "devicePub",
    version: 1,
  }
  const deviceKeyPrivate: deviceKeyPrivate = {
    key: privateKeyString,
    keyType: "devicePrivate",
    sign: keySign,
    version: 1,
  }
  const deviceKey: deviceKey = {
    public: deviceKeyPub,
    private: deviceKeyPrivate,
    hashHex: hashHexString,
    version: 1,
  }
  return deviceKey
}

export function isValidDeviceKey(
  masterKey: MasterKeyPub,
  deviceKey: deviceKeyPub,
): boolean {
  return verify(masterKey, new Uint8Array(base64ToArrayBuffer(deviceKey.key)), deviceKey.sign)
}

export async function createRoomKey(
  identityKey: IdentityKey,
): Promise<RoomKey> {
  const roomKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  )
  const exportKey = await crypto.subtle.exportKey("raw", roomKey)
  const keyString = arrayBufferToBase64(exportKey)
  const hashHex = await crypto.subtle.digest("SHA-256", exportKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  const KeySign = sign(identityKey, exportKey, "identity")
  const timeStamp = new Date(Date.now()).toISOString()
  const expiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
    .toISOString()
  const timeStampSign = sign(
    identityKey,
    new TextEncoder().encode(timeStamp + expiration),
    "identity",
  )
  return {
    key: keyString,
    sign: KeySign,
    keyType: "roomKey",
    timestamp: timeStamp,
    version: 1,
    timeAndExpirationSign: timeStampSign,
    keyExpiration: expiration,
    hashHex: hashHexString,
  }
}

export function isValidRoomKey(
  identityKey: IdentityKeyPub,
  roomKey: RoomKey,
): boolean {
  return verify(identityKey, new Uint8Array(base64ToArrayBuffer(roomKey.key)), roomKey.sign) &&
    verify(
      identityKey,
      new TextEncoder().encode(roomKey.timestamp + roomKey.keyExpiration),
      roomKey.timeAndExpirationSign,
    )
}

export async function encryptWithAccountKey(
  accountKey: AccountKeyPub,
  data: string,
): Promise<EncryptedDataAccountKey> {
  const key = new Uint8Array(base64ToArrayBuffer(accountKey.key))
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(key)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    encodedData,
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "accountKey",
    encryptedKeyHashHex: accountKey.sign.hashedPublicKeyHex,
    cipherText: arrayBufferToBase64(cipherText),
    version: 1,
  }
}

export async function decryptDataWithAccountKey(
  accountKey: AccountKey,
  encryptedData: EncryptedDataAccountKey,
): Promise<string> {
  const key = new Uint8Array(base64ToArrayBuffer(accountKey.private.key))
  const sharedSecret = ml_kem768.decapsulate(
    new Uint8Array(base64ToArrayBuffer(encryptedData.cipherText)),
    key,
  )
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function encryptDataDeviceKey(
  deviceKey: deviceKey,
  data: string,
): Promise<EncryptedDataDeviceKey> {
  const key = new Uint8Array(base64ToArrayBuffer(deviceKey.public.key))
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(key)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    encodedData,
  )
  const hashHex = await crypto.subtle.digest("SHA-256", key)
  const hashHexString = arrayBufferToBase64(hashHex)
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "DeviceKey",
    encryptedKeyHashHex: hashHexString,
    cipherText: arrayBufferToBase64(cipherText),
    version: 1,
  }
}

export async function decryptDataDeviceKey(
  deviceKey: deviceKey,
  encryptedData: EncryptedDataDeviceKey,
): Promise<string> {
  const key = new Uint8Array(base64ToArrayBuffer(deviceKey.private.key))
  const sharedSecret = ml_kem768.decapsulate(
    new Uint8Array(base64ToArrayBuffer(encryptedData.cipherText)),
    key,
  )
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function createKeyShareKey(
  masterKey: MasterKey,
): Promise<KeyShareKey> {
  const key = ml_kem768.keygen()
  const publicKeyString = arrayBufferToBase64(key.publicKey)
  const privateKeyString = arrayBufferToBase64(key.secretKey)
  const hashHex = await crypto.subtle.digest("SHA-256", key.publicKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  const time = new Date(Date.now()).toISOString()
  const expiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const timeAndExpirationSign = sign(
    masterKey,
    new TextEncoder().encode(time + expiration),
    "master",
  )
  const pubKeySign = sign(masterKey, key.publicKey, "master")
  return {
    public: {
      key: publicKeyString,
      keyType: "keySharePub",
      version: 1,
      timestamp: time,
      keyExpiration: expiration,
      timeAndExpirationSign,
      sign: pubKeySign,
    },
    private: {
      key: privateKeyString,
      keyType: "keySharePrivate",
    },
    hashHex: hashHexString,
    version: 1,
  }
}

export function isValidKeyShareKey(
  masterKey: MasterKeyPub,
  keyShareKey: KeyShareKeyPub,
): boolean {
  return verify(
    masterKey,
    new Uint8Array(base64ToArrayBuffer(keyShareKey.key)),
    keyShareKey.sign,
  ) &&
    verify(
      masterKey,
      new TextEncoder().encode(keyShareKey.timestamp + keyShareKey.keyExpiration),
      keyShareKey.timeAndExpirationSign,
    )
}

export async function encryptAndSignDataWithKeyShareKey(
  keyShareKey: KeyShareKey,
  data: string,
  masterKey: MasterKey,
): Promise<EncryptedDataKeyShareKey> {
  const key = new Uint8Array(base64ToArrayBuffer(keyShareKey.public.key))
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(key)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    encodedData,
  )
  const hashHex = await crypto.subtle.digest("SHA-256", key)
  const hashHexString = arrayBufferToBase64(hashHex)
  const dataSign = sign(masterKey, new Uint8Array(encryptedData), "master")
  const result: EncryptedDataKeyShareKey = {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "keyShareKey",
    encryptedDataSign: dataSign,
    encryptedKeyHashHex: hashHexString,
    signKeyHashHex: keyShareKey.hashHex,
    version: 1,
    cipherText: arrayBufferToBase64(cipherText),
  }
  return result
}

export async function decryptAndVerifyDataWithKeyShareKey(
  keyShareKey: KeyShareKey,
  encryptedData: EncryptedDataKeyShareKey,
  master_key: MasterKeyPub,
): Promise<string | null> {
  const verifyData = verify(
    master_key,
    new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
    encryptedData.encryptedDataSign,
  )
  if (!verifyData) {
    return null
  }
  const key = new Uint8Array(base64ToArrayBuffer(keyShareKey.private.key))
  const sharedSecret = ml_kem768.decapsulate(
    new Uint8Array(base64ToArrayBuffer(encryptedData.cipherText)),
    key,
  )
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function generateMigrateKey(): Promise<migrateKey> {
  const key = ml_kem768.keygen()
  const publicKeyString = arrayBufferToBase64(key.publicKey)
  const privateKeyString = arrayBufferToBase64(key.secretKey)
  const hashHex = await crypto.subtle.digest("SHA-256", key.publicKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  return {
    public: {
      key: publicKeyString,
      keyType: "migratePub",
      version: 1,
    },
    private: {
      key: privateKeyString,
      keyType: "migratePrivate",
      version: 1,
    },
    hashHex: hashHexString,
    version: 1,
  }
}

export async function encryptDataWithMigrateKey(
  migrateKey: migrateKeyPub,
  data: string,
): Promise<string> {
  const key = new Uint8Array(base64ToArrayBuffer(migrateKey.key))
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(key)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    encodedData,
  )
  return JSON.stringify([arrayBufferToBase64(encryptedData), arrayBufferToBase64(cipherText)])
}

export async function decryptDataWithMigrateKey(
  migrateKey: migrateKey,
  encryptedData: string,
): Promise<string> {
  const key = new Uint8Array(base64ToArrayBuffer(migrateKey.private.key))
  const [encryptedDataString, cipherTextString] = JSON.parse(encryptedData)
  const sharedSecret = ml_kem768.decapsulate(
    new Uint8Array(base64ToArrayBuffer(cipherTextString)),
    key,
  )
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    new Uint8Array(base64ToArrayBuffer(encryptedDataString)),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function generateMigrateDataSignKey(): Promise<
  migrateDataSignKey
> {
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const key = ml_dsa65.keygen(seed)
  const publicKeyString = arrayBufferToBase64(key.publicKey)
  const privateKeyString = arrayBufferToBase64(key.secretKey)
  const hashHex = await crypto.subtle.digest("SHA-256", key.publicKey)
  const hashHexString = arrayBufferToBase64(hashHex)
  return {
    public: {
      key: publicKeyString,
      keyType: "migrateDataSignPub",
      version: 1,
    },
    private: {
      key: privateKeyString,
      keyType: "migrateDataSignPrivate",
      version: 1,
    },
    hashHex: hashHexString,
    version: 1,
  }
}

export function signDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKey,
  data: string,
): string {
  const key = new Uint8Array(base64ToArrayBuffer(migrateDataSignKey.private.key))
  const sign = ml_dsa65.sign(key, new TextEncoder().encode(data))
  return arrayBufferToBase64(sign)
}

export function verifyDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKeyPub,
  data: string,
  signature: string,
): boolean {
  const key = new Uint8Array(base64ToArrayBuffer(migrateDataSignKey.key))
  const sign = new Uint8Array(base64ToArrayBuffer(signature))
  const isValid = ml_dsa65.verify(key, new TextEncoder().encode(data), sign)
  return isValid
}

export async function encryptDataRoomKey(
  roomKey: RoomKey,
  data: string,
): Promise<EncryptedDataRoomKey> {
  const key = new Uint8Array(base64ToArrayBuffer(roomKey.key))
  const vi = crypto.getRandomValues(new Uint8Array(12))
  const encodedData = new TextEncoder().encode(data)
  const roomKeyCryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: vi,
    },
    roomKeyCryptoKey,
    encodedData,
  )
  const hashHex = await crypto.subtle.digest("SHA-256", key)
  const hashHexString = arrayBufferToBase64(hashHex)
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "roomKey",
    iv: arrayBufferToBase64(vi),
    encryptedKeyHashHex: hashHexString,
    version: 1,
  }
}
export async function decryptDataRoomKey(
  roomKey: RoomKey,
  encryptedData: EncryptedDataRoomKey,
): Promise<string | null> {
  const key = new Uint8Array(base64ToArrayBuffer(roomKey.key))
  const roomKeyCryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(base64ToArrayBuffer(encryptedData.iv)),
    },
    roomKeyCryptoKey,
    new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}

export type EncryptedMessage = {
  value: {
    data: EncryptedDataRoomKey
    timestamp: string
  }
  signature: Sign
}

export async function encryptMessage(
  roomKey: RoomKey,
  identityKey: IdentityKey,
  message: Message,
): Promise<EncryptedMessage> {
  const now = new Date()
  const roomKeyExpiration = new Date(roomKey.keyExpiration)
  if (
    now > roomKeyExpiration ||
    now < new Date(roomKey.timestamp) ||
    roomKeyExpiration.getTime() - new Date(roomKey.timestamp).getTime() > 365 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Room key expired")
  }
  if (
    now < new Date(identityKey.public.timestamp)
  ) {
    throw new Error("identity key expired2")
  }
  const data = JSON.stringify(message)
  const encryptedData = await encryptDataRoomKey(roomKey, data)
  const signature = sign(identityKey, new TextEncoder().encode(encryptedData.encryptedData), "identity")
  return {
    value: {
      data: encryptedData,
      timestamp: now.toISOString(),
    },
    signature,
  }
}

export async function verifyAndDecryptMessage(
  roomKey: RoomKey,
  identityKey: IdentityKeyPub,
  encryptedMessage: EncryptedMessage,
): Promise<Message | null> {
  const now = new Date()
  const roomKeyExpiration = new Date(roomKey.keyExpiration)
  if (
    now > roomKeyExpiration ||
    now < new Date(roomKey.timestamp) ||
    roomKeyExpiration.getTime() - new Date(roomKey.timestamp).getTime() > 365 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Room key expired")
  }
  if (
    now < new Date(identityKey.timestamp)
  ) {
    throw new Error("identity key expired2")
  }
  const isValid = verify(
    identityKey,
    new TextEncoder().encode(encryptedMessage.value.data.encryptedData),
    encryptedMessage.signature,
  )
  if (!isValid) {
    console.log("signature is invalid")
    return null
  }
  const data = await decryptDataRoomKey(roomKey, encryptedMessage.value.data)
  if (data === null) {
    return null
  }
  return JSON.parse(data)
}

export async function generateKeyHashHex(
    key:
    | MasterKeyPub
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | KeyShareKeyPub
    | migrateKeyPub
    | migrateDataSignKeyPub
    | RoomKey,
): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(base64ToArrayBuffer(key.key)))
  return arrayBufferToBase64(hash)
}

export async function generateKeyHashHexJWK(
    key:
    | MasterKeyPub
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | KeyShareKeyPub
    | migrateKeyPub
    | migrateDataSignKeyPub
    | RoomKey,
): Promise<string> {
  return await generateKeyHashHex(key)
}

export function signData(
    key: IdentityKey | MasterKey,
    data: string,
): Sign {
  return sign(key, new TextEncoder().encode(data), "master")
}

export function verifyData(
    key: IdentityKeyPub | MasterKeyPub,
    data: string,
    sign: Sign,
): boolean {
  return verify(key, new TextEncoder().encode(data), sign)
}