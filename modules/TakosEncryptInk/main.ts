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

import {dilithium} from 'dilithium-crystals';

import kyber from 'crystals-kyber';

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return encode(buffer)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return decode(base64)
}

export async function exportfromJWK(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey("jwk", key)
}

// 文字列のハッシュを生成
async function hashString(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  return [...new Uint8Array(hashBuffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function generateKeyHashHexCryptoKey(
  key: CryptoKey,
  type:
    | "masterPub"
    | "identityPub"
    | "accountPub"
    | "devicePub"
    | "keySharePub"
    | "migratePub"
    | "migrateDataSignPub"
    | "roomKey"
    | "devicePrivate",
  version: number,
): Promise<string> {
  if (version == 1) {
    let keyType
    switch (type) {
      case "masterPub":
        keyType = "RSAPub"
        break
      case "identityPub":
        keyType = "RSAPub"
        break
      case "accountPub":
        keyType = "RSAPub"
        break
      case "devicePub":
        keyType = "RSAPub"
        break
      case "keySharePub":
        keyType = "RSAPub"
        break
      case "migratePub":
        keyType = "RSAPub"
        break
      case "migrateDataSignPub":
        keyType = "RSAPub"
        break
      case "roomKey":
        keyType = "AESKey"
        break
      case "devicePrivate":
        keyType = "RSAPriv"
        break
    }
    if (keyType == "AESKey") {
      // CryptoKeyをArrayBufferに変換
      const keyBuffer = await crypto.subtle.exportKey("raw", key)

      // ArrayBufferをUint8Arrayに変換
      const keyArray = new Uint8Array(keyBuffer)

      // Uint8ArrayをBase64文字列に変換
      const base64Key = btoa(String.fromCharCode(...keyArray))

      // Base64文字列をハッシュ化
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(base64Key),
      )

      // ハッシュ値を16進数文字列に変換
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      return hashHex
    }
    if (keyType == "RSAPub") {
      //base64に変換
      const keyBuffer = await crypto.subtle.exportKey("spki", key)
      const keyArray = new Uint8Array(keyBuffer)
      const base64Key = btoa(String.fromCharCode(...keyArray))
      //ハッシュ化
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(base64Key),
      )
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      return hashHex
    }
    if (keyType == "RSAPriv") {
      const keyBuffer = await crypto.subtle.exportKey("pkcs8", key)
      const keyArray = new Uint8Array(keyBuffer)
      const base64Key = btoa(String.fromCharCode(...keyArray))
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(base64Key),
      )
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("")
      return hashHex
    }
  }
  throw new Error(`Unsupported keyType: ${type}`)
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
  //上の関数と同じものを返す
  return await generateKeyHashHexCryptoKey(
    await importKey(key, "public"),
    key.keyType,
    Number(key.version),
  )
}

export async function createMasterKey(): Promise<MasterKey> {
  const KeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
  const MasterKeyPublickHex = await generateKeyHashHexCryptoKey(
    KeyPair.publicKey,
    "masterPub",
    1,
  )
  return {
    public: {
      key: await exportfromJWK(KeyPair.publicKey),
      keyType: "masterPub",
      version: 1,
    },
    private: {
      key: await exportfromJWK(KeyPair.privateKey),
      keyType: "masterPrivate",
      version: 1,
    },
    hashHex: MasterKeyPublickHex,
    version: 1,
  }
}

export async function createIdentityKeyAndAccountKey(
  masterKey: MasterKey,
): Promise<{ identityKey: IdentityKey; accountKey: AccountKey }> {
  const identityKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
  const identityKeyPublic = await exportfromJWK(identityKeyPair.publicKey)
  const identityKeyPrivate = await exportfromJWK(identityKeyPair.privateKey)
  const identityKeyHash = await generateKeyHashHexCryptoKey(
    identityKeyPair.publicKey,
    "identityPub",
    1,
  )

  const accountKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )
  const accountKeyPublic = await exportfromJWK(accountKeyPair.publicKey)
  const accountKeyPrivate = await exportfromJWK(accountKeyPair.privateKey)

  const identityKeyPublicText: IdentityKeyPub = {
    key: identityKeyPublic,
    keyType: "identityPub",
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    timestamp: "time",
    keyExpiration: "Expiration",
    timeAndExpirationSign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    version: 1,
  }
  const identityKeySign = await signKey(
    masterKey,
    identityKeyPublicText,
    "master",
  )
  const time = new Date(Date.now()).toISOString()
  const expiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
  const sign2 = await signKeyExpiration(masterKey, time, expiration, {
    key: identityKeyPublic,
    keyType: "identityPub",
    sign: identityKeySign,
    timestamp: "time",
    timeAndExpirationSign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    keyExpiration: "Expiration",
    version: 1,
  }, "master")

  const identityKeyPublicResult: IdentityKeyPub = {
    key: identityKeyPublic,
    keyType: "identityPub",
    sign: identityKeySign,
    timestamp: time,
    keyExpiration: expiration,
    timeAndExpirationSign: sign2,
    version: 1,
  }
  const identityKeyPrivateResult: IdentityKeyPrivate = {
    key: identityKeyPrivate,
    keyType: "identityPrivate",
    version: 1,
  }
  const identityKey: IdentityKey = {
    public: identityKeyPublicResult,
    private: identityKeyPrivateResult,
    hashHex: identityKeyHash,
    version: 1,
  }
  const accountKeyPubTest: AccountKeyPub = {
    key: accountKeyPublic,
    keyType: "accountPub",
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "identity",
      version: 1,
    },
    version: 1,
  }
  const accountKeySign = await signKey(
    identityKey,
    accountKeyPubTest,
    "identity",
  )
  const accountKey: AccountKey = {
    public: {
      key: accountKeyPublic,
      keyType: "accountPub",
      sign: accountKeySign,
      version: 1,
    },
    private: {
      key: accountKeyPrivate,
      keyType: "accountPrivate",
      version: 1,
    },
    hashHex: identityKey.hashHex,
    version: 1,
  }
  return { identityKey, accountKey }
}

export async function importKey(
  inputKey:
    | IdentityKeyPub
    | IdentityKeyPrivate
    | AccountKeyPub
    | AccountKeyPrivate
    | MasterKeyPub
    | MasterKeyPrivate
    | RoomKey
    | deviceKeyPub
    | deviceKeyPrivate
    | KeyShareKeyPub
    | KeyShareKeyPrivate
    | migrateKeyPub
    | migrateKeyPrivate
    | migrateDataSignKeyPub
    | migrateDataSignKeyPrivate,
  usages?: "public" | "private",
): Promise<CryptoKey> {
  const jwk = inputKey.key
  const keyType = inputKey.keyType
  let type: string
  switch (keyType) {
    case "identityPub":
      type = "RSA-PSS"
      break
    case "identityPrivate":
      type = "RSA-PSS"
      break
    case "accountPub":
      type = "RSA-OAEP"
      break
    case "accountPrivate":
      type = "RSA-OAEP"
      break
    case "masterPub":
      type = "RSA-PSS"
      break
    case "masterPrivate":
      type = "RSA-PSS"
      break
    case "roomKey":
      type = "AES-GCM"
      break
    case "devicePub":
      type = "RSA-OAEP"
      break
    case "devicePrivate":
      type = "RSA-OAEP"
      break
    case "keySharePub":
      type = "RSA-OAEP"
      break
    case "keySharePrivate":
      type = "RSA-OAEP"
      break
    case "migratePub":
      type = "RSA-OAEP"
      break
    case "migratePrivate":
      type = "RSA-OAEP"
      break
    case "migrateDataSignPub":
      type = "RSA-PSS"
      break
    case "migrateDataSignPrivate":
      type = "RSA-PSS"
      break
    default:
      throw new Error(`Unsupported keyType: ${keyType}`)
  }
  let key: CryptoKey
  if (type === "RSA-OAEP") {
    const keyUsages: KeyUsage[] = usages === "public" ? ["encrypt"] : ["decrypt"]
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      keyUsages,
    )
  } else if (type === "RSA-PSS") {
    const keyUsages: KeyUsage[] = usages === "public" ? ["verify"] : ["sign"]
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      keyUsages,
    )
  } else if (type === "AES-GCM") {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ])
  } else {
    throw new Error(`Unsupported type: ${type}`)
  }
  return key
}

export async function verifyKey(
  //署名した鍵の変数
  key: MasterKeyPub | IdentityKeyPub,
  signedKey:
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | deviceKeyPrivate
    | RoomKey
    | KeyShareKeyPub,
): Promise<boolean> {
  let keyType: "public" | "private"
  switch (signedKey.keyType) {
    case "identityPub":
      keyType = "public"
      break
    case "accountPub":
      keyType = "public"
      break
    case "devicePub":
      keyType = "public"
      break
    case "devicePrivate":
      keyType = "private"
      break
    case "roomKey":
      keyType = "public"
      break
    case "keySharePub":
      keyType = "public"
      break
    default:
      throw new Error(`Unsupported keyType: ${"keyToSign.keyType"}`)
  }
  const importedKey = await importKey(key, keyType)
  const keyBuffer = await crypto.subtle.exportKey(
    (keyType === "public") ? "spki" : "pkcs8",
    importedKey,
  )
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    importedKey,
    base64ToArrayBuffer(signedKey.sign.signature),
    keyBuffer, // ensure the same data is used
  )
}

export async function signKey(
  //署名する鍵の変数
  key: MasterKey | IdentityKey,
  keyToSign:
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | deviceKeyPrivate
    | RoomKey
    | KeyShareKeyPub,
  type: "master" | "identity",
): Promise<Sign> {
  let keyType: "public" | "private" | "roomKey"
  switch (keyToSign.keyType) {
    case "identityPub":
      keyType = "public"
      break
    case "accountPub":
      keyType = "public"
      break
    case "devicePub":
      keyType = "public"
      break
    case "devicePrivate":
      keyType = "private"
      break
    case "roomKey":
      keyType = "roomKey"
      break
    case "keySharePub":
      keyType = "public"
      break
    default:
      throw new Error(`Unsupported keyType: ${"keyToSign.keyType"}`)
  }
  if (keyType === "roomKey") {
    const importedKey = await importKey(keyToSign, "public")
    const keyBuffer = await crypto.subtle.exportKey(
      "raw",
      importedKey,
    )
    return await sign(
      key,
      keyBuffer,
      type,
    )
  }
  const importedKey = await importKey(keyToSign, keyType)
  const keyBuffer = await crypto.subtle.exportKey(
    (keyType === "public") ? "spki" : "pkcs8",
    importedKey,
  )
  return await sign(
    key,
    keyBuffer,
    type,
  )
}

async function sign(
  key: MasterKey | IdentityKey,
  data: ArrayBuffer,
  type: "master" | "identity",
): Promise<Sign> {
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    await importKey(key.private, "private"),
    data,
  )
  return {
    signature: arrayBufferToBase64(signature),
    hashedPublicKeyHex: await generateKeyHashHexCryptoKey(
      await importKey(key.public, "public"),
      type === "master" ? "masterPub" : "identityPub",
      1,
    ),
    type,
    version: 1,
  }
}

export async function signKeyExpiration(
  key: MasterKey | IdentityKey,
  time: string,
  expiration: string,
  signedKey:
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | RoomKey
    | KeyShareKeyPub,
  type: "master" | "identity",
): Promise<Sign> {
  const hashHex = await generateKeyHashHexJWK(signedKey)
  const buffer = new TextEncoder().encode(time + expiration + hashHex)
  const signResult = await sign(
    key,
    buffer,
    type,
  )
  return signResult
}

export async function isValidKeyExpiration(
  key: MasterKeyPub | IdentityKeyPub,
  signAndKey: {
    timestamp: string // 鍵の作成日時
    keyExpiration: string // 鍵の有効期限
    timeAndExpirationSign: Sign // 鍵の作成日時と有効期限に対する署名
  },
  signedKey:
    | IdentityKeyPub
    | AccountKeyPub
    | deviceKeyPub
    | RoomKey
    | KeyShareKeyPub,
): Promise<boolean> {
  try {
    const importedKey = await crypto.subtle.importKey(
      "jwk",
      key.key,
      { name: "RSA-PSS", hash: { name: "SHA-256" } },
      true,
      ["verify"],
    )
    const signatureBuffer = base64ToArrayBuffer(
      signAndKey.timeAndExpirationSign.signature,
    )
    const hashHex = await generateKeyHashHexJWK(signedKey)
    const hashBuffer = new TextEncoder().encode(
      signAndKey.timestamp + signAndKey.keyExpiration + hashHex,
    )
    return await crypto.subtle.verify(
      {
        name: "RSA-PSS",
        saltLength: 32,
      },
      importedKey,
      signatureBuffer,
      hashBuffer,
    )
  } catch (error) {
    console.error("Verification failed:", error)
    return false
  }
}

export async function createDeviceKey(
  masterKey: MasterKey,
): Promise<deviceKey> {
  const deviceKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )
  const deviceKeyPublic = await exportfromJWK(deviceKeyPair.publicKey)
  const deviceKeyPrivate = await exportfromJWK(deviceKeyPair.privateKey)
  const deviceKeyPublicText: deviceKeyPub = {
    key: deviceKeyPublic,
    keyType: "devicePub",
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    version: 1,
  }
  const deviceKeyPrivateText: deviceKeyPrivate = {
    key: deviceKeyPrivate,
    keyType: "devicePrivate",
    version: 1,
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
  }
  const pubKeySign = await signKey(masterKey, deviceKeyPublicText, "master")
  const privKeySign = await signKey(masterKey, deviceKeyPrivateText, "master")
  return {
    public: {
      key: deviceKeyPublic,
      keyType: "devicePub",
      sign: pubKeySign,
      version: 1,
    },
    private: {
      key: deviceKeyPrivate,
      keyType: "devicePrivate",
      sign: privKeySign,
      version: 1,
    },
    hashHex: await generateKeyHashHexCryptoKey(
      deviceKeyPair.publicKey,
      "devicePub",
      1,
    ),
    version: 1,
  }
}

export async function isValidDeviceKey(
  masterKey: MasterKeyPub,
  deviceKey: deviceKey,
  checkKie: "public" | "private" | "both",
): Promise<boolean> {
  if (checkKie === "both") {
    return await verifyKey(masterKey, deviceKey.public) &&
      await verifyKey(masterKey, deviceKey.private)
  }
  if (checkKie === "public") {
    return await verifyKey(masterKey, deviceKey.public)
  }
  if (checkKie === "private") {
    return await verifyKey(masterKey, deviceKey.private)
  }
  return false
}

export async function isValidIdentityKeySign(
  masterKeyPub: MasterKeyPub,
  identityKey: IdentityKeyPub,
): Promise<boolean> {
  const masterKey = await importKey(masterKeyPub, "public")
  const masterKeyHashHex = await generateKeyHashHexCryptoKey(
    masterKey,
    "masterPub",
    1,
  )
  if (identityKey.sign.hashedPublicKeyHex !== masterKeyHashHex) {
    return false
  }
  return await verifyKey(masterKeyPub, identityKey) &&
    await isValidKeyExpiration(masterKeyPub, identityKey, identityKey)
}

export async function isValidAccountKey(
  identityKey: IdentityKeyPub,
  accountKey: AccountKeyPub,
): Promise<boolean> {
  const identityKeyCryptoKey = await importKey(identityKey, "public")
  const identityKeyHashHex = await generateKeyHashHexCryptoKey(
    identityKeyCryptoKey,
    "identityPub",
    1,
  )
  if (accountKey.sign.hashedPublicKeyHex !== identityKeyHashHex) {
    return false
  }
  return await verifyKey(identityKey, accountKey)
}

export async function signData(
  key: AccountKey | IdentityKey | MasterKey,
  data: ArrayBuffer,
): Promise<Sign> {
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    await importKey(key.private, "private"),
    data,
  )
  const publicKeyHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(key.public.key)),
  )
  const hashedPublicKeyHex = await generateKeyHashHexCryptoKey(
    await importKey(key.public, "public"),
    key.public.keyType,
    key.public.version,
  )
  return {
    signature: arrayBufferToBase64(signature),
    hashedPublicKeyHex,
    type: "master",
    version: 1,
  }
}

export async function verifyData(
  key: AccountKeyPub | IdentityKeyPub | MasterKeyPub,
  signedData: ArrayBuffer,
  signature: Sign,
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    key.key,
    { name: "RSA-PSS", hash: { name: "SHA-256" } },
    true,
    ["verify"],
  )
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    importedKey,
    base64ToArrayBuffer(signature.signature),
    signedData,
  )
}

export async function createRoomKey(
  identity_key: IdentityKey,
): Promise<RoomKey> {
  const roomKey = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  )
  const roomKeyJWK = await exportfromJWK(roomKey)
  const roomKeyText: RoomKey = {
    key: roomKeyJWK,
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "identity",
      version: 1,
    },
    timestamp: "Expiration",
    keyExpiration: "Expiration",
    timeAndExpirationSign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "identity",
      version: 1,
    },
    keyType: "roomKey",
    hashHex: "roomKeyHash",
    version: 1,
  }
  const roomKeySign = await signKey(identity_key, roomKeyText, "identity")
  const Expiration = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
    .toISOString()
  const time = new Date(Date.now()).toISOString()
  const ExpirationSign = await signKeyExpiration(
    identity_key,
    time,
    Expiration,
    {
      key: roomKeyJWK,
      sign: roomKeySign,
      timestamp: time,
      keyExpiration: Expiration,
      timeAndExpirationSign: {
        signature: "",
        hashedPublicKeyHex: "",
        type: "identity",
        version: 1,
      },
      keyType: "roomKey",
      hashHex: "roomKeyHash",
      version: 1,
    },
    "identity",
  )
  const roomKeyHash = await generateKeyHashHexCryptoKey(roomKey, "roomKey", 1)
  return {
    key: roomKeyJWK,
    sign: roomKeySign,
    timestamp: time,
    keyExpiration: Expiration,
    timeAndExpirationSign: ExpirationSign,
    keyType: "roomKey",
    hashHex: roomKeyHash,
    version: 1,
  }
}

export async function isValidRoomKey(
  identity_key: IdentityKeyPub,
  roomKey: RoomKey,
): Promise<boolean> {
  const identity_key_cryptoKey = await importKey(identity_key, "public")
  if (
    roomKey.sign.hashedPublicKeyHex !==
      await generateKeyHashHexCryptoKey(
        identity_key_cryptoKey,
        "identityPub",
        1,
      )
  ) {
    return false
  }
  if (roomKey.timestamp < new Date().toISOString()) {
    return false
  }
  return await verifyKey(identity_key, roomKey) &&
    await isValidKeyExpiration(identity_key, roomKey, roomKey)
}

//RoomKeyを使って暗号化

// AccountKeyを使って暗号化する関数
export async function encryptWithAccountKey(
  accountKey: AccountKeyPub,
  data: string,
): Promise<EncryptedDataAccountKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160)
  const key = await importKey(accountKey, "public")
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: iv,
          },
          key,
          buffer,
        ),
      )
    }),
  )
  return {
    encryptedData: encryptedData,
    keyType: "accountKey",
    iv: arrayBufferToBase64(iv),
    encryptedKeyHashHex: accountKey.sign.hashedPublicKeyHex,
    version: 1,
  }
}

// AccountKeyで暗号化されたデータを復号化し、検証する関数
export async function decryptDataWithAccountKey(
  accountKey: AccountKey,
  encryptedData: EncryptedDataAccountKey,
): Promise<string | null> {
  const key = await importKey(accountKey.private, "private")
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      )
    }),
  )
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray))
}

export async function encryptDataDeviceKey(
  deviceKey: deviceKey,
  data: string,
): Promise<EncryptedDataDeviceKey> {
  const ArrayBuffer = new TextEncoder().encode(data)
  const dividedArrayBuffer = splitArrayBuffer(ArrayBuffer, 160)
  try {
    const key = await importKey(deviceKey.public, "public")
    const encryptedData = await Promise.all(
      dividedArrayBuffer.map(async (buffer) => {
        return arrayBufferToBase64(
          await crypto.subtle.encrypt(
            {
              name: "RSA-OAEP",
            },
            key,
            buffer,
          ),
        )
      }),
    )
    return {
      encryptedData: encryptedData,
      keyType: "DeviceKey",
      encryptedKeyHashHex: deviceKey.hashHex,
      version: 1,
    }
  } catch (error) {
    console.error("Encryption failed:", error)
    throw error
  }
}

export async function decryptDataDeviceKey(
  deviceKey: deviceKey,
  encryptedData: EncryptedDataDeviceKey,
): Promise<string | null> {
  const key = await importKey(deviceKey.private, "private")
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      )
    }),
  )
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray))
}

function splitArrayBuffer(
  buffer: ArrayBuffer,
  chunkSize: number,
): ArrayBuffer[] {
  const result: ArrayBuffer[] = []
  const view = new Uint8Array(buffer)
  for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, buffer.byteLength)
    const chunk = view.slice(offset, end).buffer
    result.push(chunk)
  }
  return result
}

function rebuildArrayBuffer(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce(
    (acc, buffer) => acc + buffer.byteLength,
    0,
  )
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }
  return result.buffer
}
export async function createKeyShareKey(
  masterKey: MasterKey,
): Promise<KeyShareKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )
  const keyPublic = await exportfromJWK(keyPair.publicKey)
  const keyPrivate = await exportfromJWK(keyPair.privateKey)
  const keyShareKeyPublicText: KeyShareKeyPub = {
    key: keyPublic,
    keyType: "keySharePub",
    sign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    timestamp: "time",
    keyExpiration: "Expiration",
    timeAndExpirationSign: {
      signature: "",
      hashedPublicKeyHex: "",
      type: "master",
      version: 1,
    },
    version: 1,
  }
  const pubKeySign = await signKey(masterKey, keyShareKeyPublicText, "master")
  const time = new Date(Date.now()).toISOString()
  const expiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
  const keyShareKeyPublic: KeyShareKeyPub = {
    key: keyPublic,
    keyType: "keySharePub",
    sign: pubKeySign,
    timestamp: time,
    keyExpiration: expiration,
    timeAndExpirationSign: await signKeyExpiration(
      masterKey,
      time,
      expiration,
      keyShareKeyPublicText,
      "master",
    ),
    version: 1,
  }
  const keyShareKeyPrivate: KeyShareKeyPrivate = {
    key: keyPrivate,
    keyType: "keySharePrivate",
  }
  return {
    public: keyShareKeyPublic,
    private: keyShareKeyPrivate,
    hashHex: await generateKeyHashHexCryptoKey(
      keyPair.publicKey,
      "keySharePub",
      1,
    ),
    version: 1,
  }
}

export async function isValidKeyShareKey(
  masterKey: MasterKeyPub,
  keyShareKey: KeyShareKeyPub,
): Promise<boolean> {
  if (
    !await verifyKey(masterKey, keyShareKey) ||
    !await isValidKeyExpiration(masterKey, keyShareKey, keyShareKey)
  ) {
    return false
  }
  return true
}

export async function encryptAndSignDataWithKeyShareKey(
  keyShareKey: KeyShareKeyPub,
  data: string,
  master_key: MasterKey,
): Promise<EncryptedDataKeyShareKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160)
  const key = await importKey(keyShareKey, "public")
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: iv,
          },
          key,
          buffer,
        ),
      )
    }),
  )
  const encryptedDataSign = await signData(
    master_key,
    new TextEncoder().encode(JSON.stringify(encryptedData)),
  )
  return {
    encryptedData: encryptedData,
    keyType: "keyShareKey",
    iv: arrayBufferToBase64(iv),
    encryptedDataSign: encryptedDataSign,
    encryptedKeyHashHex: await generateKeyHashHexCryptoKey(
      key,
      "keySharePub",
      1,
    ),
    signKeyHashHex: keyShareKey.sign.hashedPublicKeyHex,
    version: 1,
  }
}

export async function decryptAndVerifyDataWithKeyShareKey(
  keyShareKey: KeyShareKey,
  encryptedData: EncryptedDataKeyShareKey,
  master_key: MasterKeyPub,
): Promise<string | null> {
  if (
    !await verifyData(
      master_key,
      new TextEncoder().encode(JSON.stringify(encryptedData.encryptedData)),
      encryptedData.encryptedDataSign,
    )
  ) {
    return null
  }
  const key = await importKey(keyShareKey.private, "private")
  const decryptedDataArray = await Promise.all(
    encryptedData.encryptedData.map(async (data) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      )
    }),
  )
  return new TextDecoder().decode(rebuildArrayBuffer(decryptedDataArray))
}

export async function generateMigrateKey(): Promise<migrateKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  )
  const keyPublic = await exportfromJWK(keyPair.publicKey)
  const keyPrivate = await exportfromJWK(keyPair.privateKey)
  return {
    public: {
      key: keyPublic,
      keyType: "migratePub",
      version: 1,
    },
    private: {
      key: keyPrivate,
      keyType: "migratePrivate",
      version: 1,
    },
    hashHex: await generateKeyHashHexCryptoKey(
      keyPair.publicKey,
      "migratePub",
      1,
    ),
    version: 1,
  }
}

export async function encryptDataWithMigrateKey(
  migrateKey: migrateKeyPub,
  data: string,
): Promise<string> {
  const vi = crypto.getRandomValues(new Uint8Array(12))
  const key = await importKey(migrateKey, "public")
  const DataArray = splitArrayBuffer(new TextEncoder().encode(data), 160)
  const encryptedData = await Promise.all(
    DataArray.map(async (buffer) => {
      return arrayBufferToBase64(
        await crypto.subtle.encrypt(
          {
            name: "RSA-OAEP",
            iv: vi,
          },
          key,
          buffer,
        ),
      )
    }),
  )
  return JSON.stringify(encryptedData)
}

export async function decryptDataWithMigrateKey(
  migrateKey: migrateKey,
  encryptedData: string,
): Promise<string> {
  const key = await importKey(migrateKey.private, "private")
  const encryptedDataArray = JSON.parse(encryptedData)
  const decryptedDataArray = await Promise.all(
    encryptedDataArray.map(async (data: string) => {
      return await crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        key,
        base64ToArrayBuffer(data),
      )
    }),
  )
  const decryptedData = rebuildArrayBuffer(decryptedDataArray)
  return new TextDecoder().decode(decryptedData)
}

export async function generateMigrateDataSignKey(): Promise<
  migrateDataSignKey
> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
  const keyPublic = await exportfromJWK(keyPair.publicKey)
  const keyPrivate = await exportfromJWK(keyPair.privateKey)
  return {
    public: {
      key: keyPublic,
      keyType: "migrateDataSignPub",
      version: 1,
    },
    private: {
      key: keyPrivate,
      keyType: "migrateDataSignPrivate",
      version: 1,
    },
    hashHex: await generateKeyHashHexCryptoKey(
      keyPair.publicKey,
      "migrateDataSignPub",
      1,
    ),
    version: 1,
  }
}

export async function signDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKey,
  data: string,
): Promise<string> {
  const key = await importKey(migrateDataSignKey.private, "private")
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    new TextEncoder().encode(data),
  )
  return arrayBufferToBase64(signature)
}

export async function verifyDataWithMigrateDataSignKey(
  migrateDataSignKey: migrateDataSignKeyPub,
  data: string,
  signature: string,
): Promise<boolean> {
  const key = await importKey(migrateDataSignKey, "public")
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    base64ToArrayBuffer(signature),
    new TextEncoder().encode(data),
  )
}
export async function encryptDataRoomKey(
  roomKey: RoomKey,
  data: string,
): Promise<EncryptedDataRoomKey> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await importKey(roomKey, "public")
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    new TextEncoder().encode(data),
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "roomKey",
    iv: arrayBufferToBase64(iv),
    encryptedKeyHashHex: roomKey.hashHex,
    version: 1,
  }
}
export async function decryptDataRoomKey(
  roomKey: RoomKey,
  encryptedData: EncryptedDataRoomKey,
): Promise<string | null> {
  const key = await importKey(roomKey, "private")
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(encryptedData.iv),
    },
    key,
    base64ToArrayBuffer(encryptedData.encryptedData),
  )
  return new TextDecoder().decode(decryptedData)
}
export type EncryptedMessage = {
  value: EncryptedDataRoomKey
  signature: Sign
}

export async function encryptMessage(
  roomKey: RoomKey,
  identityKey: IdentityKey,
  message: Message,
): Promise<EncryptedMessage> {
  const now = new Date(message.timestamp)
  const roomKeyExpiration = new Date(roomKey.keyExpiration)
  if (
    now > roomKeyExpiration ||
    now < new Date(roomKey.timestamp) ||
    roomKeyExpiration.getTime() - new Date(roomKey.timestamp).getTime() > 365 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("Room key expired")
  }
  if(
    now > new Date(identityKey.public.keyExpiration) ||
    now < new Date(identityKey.public.timestamp) ||
    new Date(identityKey.public.keyExpiration).getTime() - new Date(identityKey.public.timestamp).getTime() > 365 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("identity key expired")
  }
  const encryptedData = await encryptDataRoomKey(roomKey, JSON.stringify(message))
  const signature = await signData(identityKey, new TextEncoder().encode(JSON.stringify(message)))
  return {
    value: encryptedData,
    signature: signature,
  }
}

export async function verifyAndDecryptMessage(
  roomKey: RoomKey,
  identityKey: IdentityKeyPub,
  encryptedMessage: EncryptedMessage,
): Promise<Message | null> {
  if (!await verifyData(identityKey, new TextEncoder().encode(JSON.stringify(encryptedMessage.value)), encryptedMessage.signature)) {
    return null
  }
  const decryptedData = await decryptDataRoomKey(roomKey, encryptedMessage.value);
  if (decryptedData !== null) {
    return JSON.parse(decryptedData);
  } else {
    return null;
  }
}