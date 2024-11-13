import { ml_kem768, ml_kem1024 } from "@noble/post-quantum/ml-kem";
import { ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils/buffers.ts"
import { uuidv7 } from "uuidv7"
import { keyHash } from "./utils/keyHash.ts";
import { encrypt } from "./utils/encrypt.ts"

export {keyHash}

export function isValidUUIDv7(uuid: string): boolean {
  const uuidV7Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV7Regex.test(uuid);
}
export function parseSign (sign: string): {
  keyHash: string,
  signBinary: ArrayBuffer,
  keyType: string,
} {
  const signArray = sign.split("-");
  const keyType = signArray[0];
  const keyHash = signArray[1];
  const signBinary = base64ToArrayBuffer(signArray[2]);
  return {
    keyHash: keyHash,
    signBinary: signBinary,
    keyType: keyType,
  }
}

export function parseMasterKey(key: string): {
  keyBinary: ArrayBuffer,
  keyType: string,
} {
  const keyArray = key.split("-", 2); // 分割回数を制限
  const keyType = keyArray[0];
  const keyBinary = base64ToArrayBuffer(keyArray.slice(1).join('-'));
  return {
    keyBinary: keyBinary,
    keyType: keyType,
  }
}

export async function signMasterKey(key: string,data: string): Promise<string | null> {
  if(!isValidMasterKeyPrivate(key)) {
    return null;
  }
  const { keyBinary } = parseMasterKey(key);
  const dataArray = new TextEncoder().encode(data);
  const signature = ml_dsa87.sign(new Uint8Array(keyBinary), dataArray, new Uint8Array(64));
  const signString =  arrayBufferToBase64(signature);
  const Keyhash = await keyHash(key);
  return "masterKey" + "-" + Keyhash + "-" + signString;
}

export function verifyMasterKey(key: string,sign: string,data: string): boolean {
  if(!isValidMasterKeyPublic(key)) {
    return false;
  }
  const { keyBinary } = parseMasterKey(key);
  const signArray = parseSign(sign);
  const dataArray = new TextEncoder().encode(data);
  const verify = ml_dsa87.verify(new Uint8Array(keyBinary), dataArray, new Uint8Array(signArray.signBinary));
  return verify;
}

export async function signIdentityKey(key: string,data: string): Promise<string | null> {
  if(!isValidIdentityKeyPrivate(key)) {
    return null;
  }
  const { keyBinary } = parseIdentityKey(key);
  const dataArray = new TextEncoder().encode(data);
  const signature = ml_dsa65.sign(new Uint8Array(keyBinary), dataArray, new Uint8Array(64));
  const signString =  arrayBufferToBase64(signature);
  const Keyhash = await keyHash(key);
  return "identityKey" + "-" + Keyhash + "-" + signString;
}

export function verifyIdentityKey(key: string,sign: string,data: string): boolean {
  if(!isValidIdentityKeyPublic(key)) {
    console.log("invalid key")
    return false;
  }
  const { keyBinary } = parseIdentityKey(key);
  const signArray = parseSign(sign);
  const dataArray = new TextEncoder().encode(data);
  const verify = ml_dsa65.verify(new Uint8Array(keyBinary), dataArray, new Uint8Array(signArray.signBinary));
  return verify;
}


export function generateMasterKey(): {
  publicKey: string,
  privateKey: string,
} {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const key = ml_dsa87.keygen(seed);
  const publicKeyBinary = arrayBufferToBase64(key.publicKey);
  const privateKeyBinary = arrayBufferToBase64(key.secretKey);
  return {
    publicKey: "masterKeyPublic" + "-" + publicKeyBinary,
    privateKey: "masterKeyPrivate" + "-" + privateKeyBinary,
  }
}

export function isValidMasterKeyPublic(key: string): boolean {
  if(key.length !== 3472) {
    return false;
  } 
  const { keyBinary, keyType } = parseMasterKey(key);
  if(keyType !== "masterKeyPublic") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 2592) {
    return false;
  }
  return true;
}

export function isValidMasterKeyPrivate(key: string): boolean {
  if(key.length !== 6545) {
    return false;
  } 
  const { keyBinary, keyType } = parseMasterKey(key);
  if(keyType !== "masterKeyPrivate") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 4896) {
    return false;
  }
  return true;
}

export async function generateIdentityKey(uuid: string, masterKey: string): Promise<{
  publickKey: string,
  privateKey: string,
  sign: string,
  } | null> {
  if(!isValidUUIDv7(uuid)) {
    return null
  }
  if(!isValidMasterKeyPrivate(masterKey)) {
    return null;
  }
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const key = ml_dsa65.keygen(seed);
  const publicKeyBinary = arrayBufferToBase64(key.publicKey);
  const privateKeyBinary = arrayBufferToBase64(key.secretKey);
  const timestamp = new Date().getTime();
  const publickKey = "identityKeyPublic" + "-" + timestamp + "-" + uuid + "-" + publicKeyBinary
  const privateKey = "identityKeyPrivate" + "-" + timestamp + "-" + uuid + "-" + privateKeyBinary
  const sign = await signMasterKey(masterKey,publickKey);
  if(!sign) {
    return null;
  }
  return {
    publickKey: publickKey,
    privateKey: privateKey,
    sign: sign,
  }
}

export function parseIdentityKey(key: string): {
  timestamp: number,
  sessionUUID: string,
  keyBinary: ArrayBuffer,
  keyType: string,
} {
  const keyArray = key.split("-");
  const keyType = keyArray[0];
  const timestamp = parseInt(keyArray[1]);
  const sessionUUID = keyArray[2] + "-" + keyArray[3] + "-" + keyArray[4] + "-" + keyArray[5] + "-" + keyArray[6];
  const keyBinary = base64ToArrayBuffer(keyArray[7]);
  return {
    timestamp: timestamp,
    sessionUUID: sessionUUID,
    keyBinary: keyBinary,
    keyType: keyType,
  }
}

export function isValidIdentityKeyPublic(key: string): boolean {
  if(key.length !== 2673) {
    return false;
  } 
  const { keyBinary, keyType } = parseIdentityKey(key);
  if(keyType !== "identityKeyPublic") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 1952) {
    return false;
  }
  return true;
}

export function isValidIdentityKeyPrivate(key: string): boolean {
  if(key.length !== 5446) {
    return false;
  } 
  const { keyBinary, keyType } = parseIdentityKey(key);
  if(keyType !== "identityKeyPrivate") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 4032) {
    return false;
  }
  return true;
}

export async function generateAccountKey(masterKey: string): Promise<{
  publickKey: string,
  privateKey: string,
  sign: string,
} | null> {
  if(!isValidMasterKeyPrivate(masterKey)) {
    return null;
  }
  const key = ml_kem768.keygen();
  const publicKeyBinary = arrayBufferToBase64(key.publicKey);
  const privateKeyBinary = arrayBufferToBase64(key.secretKey);
  const timestamp = new Date().getTime();
  const publickKey = "accountKeyPublic" + "-" + timestamp  + "-" + publicKeyBinary
  const privateKey = "accountKeyPrivate" + "-" + timestamp +  "-" + privateKeyBinary
  const sign = await signMasterKey(masterKey,publickKey);
  if(!sign) {
    return null;
  }
  return {
    publickKey: publickKey,
    privateKey: privateKey,
    sign: sign,
  }
}

export function parseAccountKey(key: string): {
  timestamp: number,
  keyBinary: ArrayBuffer,
  keyType: string,
} {
  const keyArray = key.split("-");
  const keyType = keyArray[0];
  const timestamp = parseInt(keyArray[1]);
  const keyBinary = base64ToArrayBuffer(keyArray[2]);
  return {
    timestamp: timestamp,
    keyBinary: keyBinary,
    keyType: keyType,
  }
}

export function isValidAccountKeyPublic(key: string): boolean {
  if(key.length !== 1611) {
    console.log(key.length)
    return false;
  } 
  const { keyBinary, keyType } = parseAccountKey(key);
  if(keyType !== "accountKeyPublic") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 1184) {
    console.log(keyBinaryArray.length)
    return false;
  }
  return true;
}

export function isValidAccountKeyPrivate(key: string): boolean {
  if(key.length !== 3232) {
    console.log(key.length)
    return false;
  } 
  const { keyBinary, keyType } = parseAccountKey(key);
  if(keyType !== "accountKeyPrivate") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 2400) {
    console.log(keyBinaryArray.length)
    return false;
  }
  return true;
}

export async function encryptDataAccountKey(key: string, data: string): Promise<string | null> {
  if(!isValidAccountKeyPublic(key)) {
    return null;
  }
  const { keyBinary } = parseAccountKey(key);
  const dataArray = new TextEncoder().encode(data);
  const ciphertext = ml_kem768.encapsulate(new Uint8Array(keyBinary), new Uint8Array(32));
  const ciphertextString = arrayBufferToBase64(ciphertext.cipherText);
  const keyHashString = await keyHash(key)
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(ciphertext.sharedSecret),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    importedKey,
    dataArray
  );
  const viString = arrayBufferToBase64(iv);
  const encryptedDataString = arrayBufferToBase64(encryptedData);
  // format: `<KEY_TYPE>-<KEY_HASH>-<BINARY_ENCRYPTED_DATA>-<VI>[-<CIPHER_TEXT>]`
  return "accountKey" + "-" + keyHashString + "-" + encryptedDataString + "-" + viString + "-" + ciphertextString;
}

export function parseEncryptedData(data: string): {
  keyType: string,
  keyHash: string,
  encryptedData: ArrayBuffer,
  iv: ArrayBuffer,
  cipherText?: ArrayBuffer,
} {
  const dataArray = data.split("-");
  const keyType = dataArray[0];
  const keyHash = dataArray[1];
  const encryptedData = base64ToArrayBuffer(dataArray[2]);
  const iv = base64ToArrayBuffer(dataArray[3]);
  const cipherText = dataArray[4] ? base64ToArrayBuffer(dataArray[4]) : undefined;
  return {
    keyType: keyType,
    keyHash: keyHash,
    encryptedData: encryptedData,
    iv: iv,
    cipherText: cipherText,
  }
}

export function isValidEncryptedDataAccountKey(data: string): boolean {
  const { keyType, keyHash, iv, cipherText } = parseEncryptedData(data);
  if(!cipherText) {
    return false;
  }
  const sha256 = new Uint8Array(base64ToArrayBuffer(keyHash))
  if(keyType !== "accountKey") {
    return false;
  }
  if(sha256.length !== 32) {
    return false;
  }
  if(new Uint8Array(iv).length !== 12) {
    return false;
  }
  if(new Uint8Array(cipherText).length !== 1088) {
    return false;
  }
  return true;
}

export function isValidEncryptedRoomKey(data: string): boolean {
  if(new Uint8Array(base64ToArrayBuffer(data)).length !== 1263) {
    return false;
  }
  const { keyType, keyHash, iv, cipherText } = parseEncryptedData(data);
  if(!cipherText) {
    return false;
  }
  const sha256 = new Uint8Array(base64ToArrayBuffer(keyHash))
  if(keyType !== "accountKey") {
    return false;
  }
  if(sha256.length !== 32) {
    return false;
  }
  if(new Uint8Array(iv).length !== 12) {
    return false;
  }
  if(new Uint8Array(cipherText).length !== 1088) {
    return false;
  }
  return true;
}

export async function decryptDataAccountKey(key: string, data: string): Promise<string | null> {
  if(!isValidAccountKeyPrivate(key)) {
    return null;
  }
  if(!isValidEncryptedDataAccountKey(data)) {
    return null;
  }
  const { keyBinary } = parseAccountKey(key);
  const { encryptedData, iv, cipherText } = parseEncryptedData(data);
  if(!cipherText) {
    return null;
  }
  const sharedSecret = ml_kem768.decapsulate(new Uint8Array(cipherText),new Uint8Array(keyBinary));
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    importedKey,
    new Uint8Array(encryptedData)
  );
  return new TextDecoder().decode(decryptedData);
}

export async function generateRoomkey(sessionUUID: string): Promise<string | null> {
  if(!isValidUUIDv7(sessionUUID)) {
    return null
  }
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const keyString = arrayBufferToBase64(exportedKey);
  const timestamp = new Date().getTime();
  return "roomKey" + "-" + timestamp + "-" + sessionUUID  + "-" + keyString;
}

export function parseRoomKey(key: string): {
  timestamp: number,
  sessionUUID: string,
  keyBinary: ArrayBuffer,
  keyType: string,
} {
  const keyArray = key.split("-");
  const keyType = keyArray[0];
  const timestamp = parseInt(keyArray[1]);
  const sessionUUID = keyArray[2] + "-" + keyArray[3] + "-" + keyArray[4] + "-" + keyArray[5] + "-" + keyArray[6];
  const keyBinary = base64ToArrayBuffer(keyArray[7]);
  return {
    timestamp: timestamp,
    sessionUUID: sessionUUID,
    keyBinary: keyBinary,
    keyType: keyType,
  }
}

export function isValidRoomKey(key: string): boolean {
  if(key.length !== 103) {
    console.log(key.length)
    return false;
  } 
  const { keyBinary, keyType } = parseRoomKey(key);
  if(keyType !== "roomKey") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 32) {
    console.log(keyBinaryArray.length)
    return false;
  }
  return true;
}

export async function encryptDataRoomKey(key: string, data: string): Promise<string | null> {
  if(!isValidRoomKey(key)) {
    return null;
  }
  const { keyBinary } = parseRoomKey(key);
  const dataArray = new TextEncoder().encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyBinary),
    "AES-GCM",
    true,
    ["encrypt"]
  );
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    importedKey,
    dataArray
  );
  const viString = arrayBufferToBase64(iv);
  const encryptedDataString = arrayBufferToBase64(encryptedData);
  const keyHashString = await keyHash(key);
  return "roomKey" + "-" + keyHashString + "-" + encryptedDataString + "-" + viString;
}

export function isValidEncryptedDataRoomKey(data: string): boolean {
  const { keyType, keyHash, iv} = parseEncryptedData(data);
  const sha256 = new Uint8Array(base64ToArrayBuffer(keyHash))
  if(keyType !== "roomKey") {
    return false;
  }
  if(sha256.length !== 32) {
    return false;
  }
  if(new Uint8Array(iv).length !== 12) {
    return false;
  }
  return true;
}

export async function decryptDataRoomKey(key: string, data: string): Promise<string | null> {
  if(!isValidRoomKey(key)) {
    return null;
  }
  if(!isValidEncryptedDataRoomKey(data)) {
    return null;
  }
  const { keyBinary } = parseRoomKey(key);
  const { encryptedData, iv } = parseEncryptedData(data);
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyBinary),
    "AES-GCM",
    true,
    ["decrypt"]
  );
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    importedKey,
    new Uint8Array(encryptedData)
  );
  return new TextDecoder().decode(decryptedData);
}
export interface roomKeyMetaData {
  roomKeyHash: string;
  sharedUser: {
    userId: string; //<userId>
    masterKeyHash: string; // <sha256 encoded by base64>
    accountKeyTimeStamp: number; // <timestamp>
  }[];
}
export async function encryptRoomKeyWithAccountKeys(key: {
  masterKey: string,
  accountKeySign: string,
  accountKey: string,
  userId: string,
}[], roomKey: string,identityKey: string): Promise<{
  metadata: string; metadataSign: string; encryptedData: {
    userId: string
    encryptedData: string
  }[]
} | null> {
  const encryptedData = []
  const sharedUser: {
    userId: string; //<userId>
    masterKeyHash: string; // <sha256 encoded by base64>
    accountKeyTimeStamp: number; // <timestamp>
  }[] = []
  for(const k of key) {
    if(!isValidMasterKeyPublic(k.masterKey)) {
      return null;
    }
    if(!isValidAccountKeyPublic(k.accountKey)) {
      return null;
    }
    if(!verifyMasterKey(k.masterKey, k.accountKeySign, k.accountKey)) {
      return null;
    }
    const data = await encryptDataAccountKey(k.accountKey, roomKey);
    if(!data) {
      return null;
    }
    const accountKey = parseAccountKey(k.accountKey);
    sharedUser.push({
      userId: k.userId,
      masterKeyHash: await keyHash(k.masterKey),
      accountKeyTimeStamp: accountKey.timestamp,
    })
    encryptedData.push({
      userId: k.userId,
      encryptedData: data,
    })
  }
  const roomKeyHash = await keyHash(roomKey);
  const roomKeyMetaData: roomKeyMetaData = {
    roomKeyHash: roomKeyHash,
    sharedUser: sharedUser,
  }
  const metadata = JSON.stringify(roomKeyMetaData);
  const metadataSign = await signIdentityKey(identityKey, metadata);
  if(!metadataSign) {
    return null;
  }
  return {
    metadata: metadata,
    metadataSign: metadataSign,
    encryptedData: encryptedData,
  }
}

export async function encryptMessage(
  message: {
    type: "text" | "image" | "video" | "audio" | "file",
    content: string,
    channel: string,
    timestamp: number,
    isLarge: boolean,
    original?: string,
  },
  roomKey: string,
  identityKey: string,
  roomid: string,
): Promise<{
  message: string,
  sign: string,
} | null> {
  if(!isValidRoomKey(roomKey)) {
    return null;
  }
  if(!isValidIdentityKeyPrivate(identityKey)) {
    return null;
  }
  const messageContent = JSON.stringify({
    type: message.type,
    content: message.content,
  })
  const data = await encryptDataRoomKey(roomKey, messageContent);
  if(!data) {
    return null;
  }
  const messageObj = {
    encrypted: true,
    value: data,
    channel: message.channel,
    timestamp: message.timestamp,
    isLarge: message.isLarge,
    original: message.original,
    roomid: roomid,
  }
  const messageString = JSON.stringify(messageObj);
  const sign = await signIdentityKey(identityKey, messageString);
  if(!sign) {
    return null;
  }
  return {
    message: messageString,
    sign: sign,
  }
}

export async function decryptMessage(
  message: {
    message: string,
    sign: string,
  },
  serverData: {
    timestamp: number,
  },
  roomKey: string,
  identityKey: string,
  roomid: string,
): Promise<{
  type: "text" | "image" | "video" | "audio" | "file",
  content: string,
  channel: string,
  timestamp: number,
  isLarge: boolean,
  original?: string,
} | null> {
  if(!isValidRoomKey(roomKey)) {
    return null;
  }
  if(!isValidIdentityKeyPublic(identityKey)) {
    return null;
  }
  const { message: messageString, sign: signString } = message;
  if(!verifyIdentityKey(identityKey, signString, messageString)) {
    return null;
  }
  const messageObj = JSON.parse(messageString);
  if(!messageObj.encrypted) {
    return messageObj;
  }
  //messageObj.timestampとserverData.timestampの誤差が1分いないではない場合はエラー
  if(Math.abs(messageObj.timestamp - serverData.timestamp) > 60000) {
    return null;
  }
  const data = await decryptDataRoomKey(roomKey, messageObj.value);
  if(!data) {
    return null;
  }
  if(roomid !== messageObj.roomid) {
    return null;
  }
  const messageContent = JSON.parse(data);
  return {
    type: messageContent.type,
    content: messageContent.content,
    channel: messageObj.channel,
    timestamp: messageObj.timestamp,
    isLarge: messageObj.isLarge,
    original: messageObj.original,
  }
}

export async function generateShareKey(masterKey: string, sessionUUID: string): Promise<{
  publickKey: string,
  privateKey: string,
  sign: string,
} | null> {
  if(!isValidMasterKeyPrivate(masterKey)) {
    return null;
  }
  if(!isValidUUIDv7(sessionUUID)) {
    return null;
  }
  const key = ml_kem768.keygen();
  const publicKeyBinary = arrayBufferToBase64(key.publicKey);
  const privateKeyBinary = arrayBufferToBase64(key.secretKey);
  const timestamp = new Date().getTime();
  const publickKey = "shareKeyPublic" + "-" + timestamp + "-" + sessionUUID + "-" + publicKeyBinary
  const privateKey = "shareKeyPrivate" + "-" + timestamp + "-" + sessionUUID + "-" + privateKeyBinary
  const sign = await signMasterKey(masterKey,publickKey);
  if(!sign) {
    return null;
  }
  return {
    publickKey: publickKey,
    privateKey: privateKey,
    sign: sign,
  }
}

export function parseShareKey(key: string): {
  timestamp: number,
  sessionUUID: string,
  keyBinary: ArrayBuffer,
  keyType: string,
} {
  const keyArray = key.split("-");
  const keyType = keyArray[0];
  const timestamp = parseInt(keyArray[1]);
  const sessionUUID = keyArray[2] + "-" + keyArray[3] + "-" + keyArray[4] + "-" + keyArray[5] + "-" + keyArray[6];
  const keyBinary = base64ToArrayBuffer(keyArray[7]);
  return {
    timestamp: timestamp,
    sessionUUID: sessionUUID,
    keyBinary: keyBinary,
    keyType: keyType,
  }
}

export function isValidShareKeyPublic(key: string): boolean {
  if(key.length !== 1646) {
    console.log(key.length) 
    return false;
  } 
  const { keyBinary, keyType } = parseShareKey(key);
  if(keyType !== "shareKeyPublic") {
    console.log(keyType)
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 1184) {
    console.log(keyBinaryArray.length)
    return false;
  }
  return true;
}

export function isValidShareKeyPrivate(key: string): boolean {
  if(key.length !== 3267) {
    console.log(key.length)
    return false;
  } 
  const { keyBinary, keyType } = parseShareKey(key);
  if(keyType !== "shareKeyPrivate") {
    return false;
  }
  const keyBinaryArray = new Uint8Array(keyBinary);
  if(keyBinaryArray.length !== 2400) {
    console.log(keyBinaryArray.length)
    return false;
  }
  return true;
}

export async function encryptDataShareKey(key: string, data: string): Promise<string | null> {
  if(!isValidShareKeyPublic(key)) {
    return null;
  }
  const { keyBinary } = parseShareKey(key);
  const dataArray = new TextEncoder().encode(data);
  const ciphertext = ml_kem768.encapsulate(new Uint8Array(keyBinary), new Uint8Array(32));
  const ciphertextString = arrayBufferToBase64(ciphertext.cipherText);
  const keyHashString = await keyHash(key)
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(ciphertext.sharedSecret),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    importedKey,
    dataArray
  );
  const viString = arrayBufferToBase64(iv);
  const encryptedDataString = arrayBufferToBase64(encryptedData);
  // format: `<KEY_TYPE>-<KEY_HASH>-<BINARY_ENCRYPTED_DATA>-<VI>[-<CIPHER_TEXT>]`
  return "shareKey" + "-" + keyHashString + "-" + encryptedDataString + "-" + viString + "-" + ciphertextString;
}

export async function decryptDataShareKey(key: string, data: string): Promise<string | null> {
  if(!isValidShareKeyPrivate(key)) {
    return null;
  }
  if(data.length !== 5856) {
    return null;
  }
  const { keyBinary } = parseShareKey(key);
  const { encryptedData, iv, cipherText } = parseEncryptedData(data);
  if(!cipherText) {
    return null;
  }
  const sharedSecret = ml_kem768.decapsulate(new Uint8Array(cipherText),new Uint8Array(keyBinary));
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    importedKey,
    new Uint8Array(encryptedData)
  );
  return new TextDecoder().decode(decryptedData);
}

async function test() {
  const roomid = "bob@takos.jp" + "-" + "alice@takos.jp";
  async function generateUserKey() {
    const masterKey = generateMasterKey()
    const key = await generateIdentityKey(uuidv7(), masterKey.privateKey)
    if(!key) {
      return
    }
    const accountKey = await generateAccountKey(masterKey.privateKey)
    if(!accountKey) {
      return
    }
    const sessionUUID = uuidv7();
    return {
      masterKey: masterKey,
      identityKey: key,
      accountKey: accountKey,
      sessionUUID: sessionUUID,
    }
  }
  const alice = await generateUserKey()
  const bob = await generateUserKey()
  if(!alice || !bob) {
    return
  }
  const aliceRoomKey = await generateRoomkey(alice.sessionUUID)
  if(!aliceRoomKey) {
    return
  }
  const roomKeyMetaData = await encryptRoomKeyWithAccountKeys([{
    userId: "bob@takos.jp",
    masterKey: bob.masterKey.publicKey,
    accountKey: bob.accountKey.publickKey,
    accountKeySign: bob.accountKey.sign,
  }], aliceRoomKey, alice.identityKey.privateKey)
  const encryptedMessage = await encryptMessage({
    type: "text",
    content: "Hello",
    channel: "main",
    timestamp: new Date().getTime(),
    isLarge: false,
  }, aliceRoomKey, alice.identityKey.privateKey, roomid)
  if(!encryptedMessage || !roomKeyMetaData) {
    return
  }
  const roomKey = await decryptDataAccountKey(bob.accountKey.privateKey, roomKeyMetaData.encryptedData[0].encryptedData)
  console.log(new Uint8Array(base64ToArrayBuffer(roomKeyMetaData.encryptedData[0].encryptedData)).length)
  if(!roomKey) {
    return
  }
  const decryptedMessage = await decryptMessage(encryptedMessage, {
    timestamp: new Date().getTime(),
  }, roomKey, alice.identityKey.publickKey, roomid)
  const shareKey = await generateShareKey(alice.masterKey.privateKey, alice.sessionUUID)
  if(!shareKey) {
    return
  }
  const encryptedShareKey = await encryptDataShareKey(shareKey.publickKey, alice.accountKey.privateKey)
  if(!encryptedShareKey) {
    return
  }
  console.log(encryptedShareKey.length)
  console.log(await decryptDataShareKey(shareKey.privateKey, encryptedShareKey))
}