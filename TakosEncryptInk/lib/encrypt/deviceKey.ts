import type { EncryptedDataDeviceKeyObject } from "../../types/EncryptedData.ts"
import type { deviceKeyObject } from "../../types/keys.ts"
import { arrayBufferToBase64, base64ToArrayBuffer } from "../../utils/buffers.ts"
import { keyHash } from "../../utils/keyHash.ts"
import { isValidDeviceKey } from "../isValid.ts/deviceKey.ts"

async function encryptDataRoomKeyObject(data: string, key: deviceKeyObject): Promise<string> {
  const keyRaw = new Uint8Array(base64ToArrayBuffer(key.key))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const keyCrypto = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    "AES-GCM",
    true,
    ["encrypt"],
  )
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    keyCrypto,
    new TextEncoder().encode(data),
  )
  const encryptedDataRoomKey: EncryptedDataDeviceKeyObject = {
    encryptedData: arrayBufferToBase64(encryptedData),
    vi: arrayBufferToBase64(iv),
    encryptedKeyHash: await keyHash(key.key),
    type: "deviceKey",
    version: 1,
  }
  return JSON.stringify(encryptedDataRoomKey)
}

async function decryptDataRoomKeyObject(data: string, key: deviceKeyObject): Promise<string> {
  const keyRaw = new Uint8Array(base64ToArrayBuffer(key.key))
  const keyCrypto = await crypto.subtle.importKey(
    "raw",
    keyRaw,
    "AES-GCM",
    true,
    ["decrypt"],
  )
  const encryptedDataRoomKey: EncryptedDataDeviceKeyObject = JSON.parse(data)
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(encryptedDataRoomKey.vi),
    },
    keyCrypto,
    base64ToArrayBuffer(encryptedDataRoomKey.encryptedData),
  )
  return new TextDecoder().decode(decryptedData)
}

export async function encryptDataDeviceKey(data: string, key: string): Promise<string> {
  if (!isValidDeviceKey(key)) throw new Error("Invalid key")
  return await encryptDataRoomKeyObject(data, JSON.parse(key))
}

export async function decryptDataDeviceKey(data: string, key: string): Promise<string> {
  if (!isValidDeviceKey(key)) throw new Error("Invalid key")
  return await decryptDataRoomKeyObject(data, JSON.parse(key))
}
