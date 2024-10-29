import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { arrayBufferToBase64, base64ToArrayBuffer } from "./buffers.ts"

export async function encrypt(
  data: string,
  publicKey: string,
): Promise<{ encryptedData: string; chipherText: string; vi: string }> {
  const key = new Uint8Array(base64ToArrayBuffer(publicKey))
  const { sharedSecret, cipherText } = ml_kem768.encapsulate(key)
  const vi = crypto.getRandomValues(new Uint8Array(16))
  //AES-GCMでimport
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  )
  //暗号化
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: vi,
    },
    aesKey,
    new TextEncoder().encode(data),
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData), // 修正: Base64エンコード
    chipherText: arrayBufferToBase64(cipherText),
    vi: arrayBufferToBase64(vi),
  }
}

export async function decrypt(
  encryptedData: string,
  chipherText: string,
  vi: string,
  privateKey: string,
): Promise<string> {
  const key = new Uint8Array(base64ToArrayBuffer(privateKey))
  const cipherText = new Uint8Array(base64ToArrayBuffer(chipherText))
  const viArray = new Uint8Array(base64ToArrayBuffer(vi))
  const sharedSecret = ml_kem768.decapsulate(cipherText, key)
  //AES-GCMでimport
  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  )
  //復号
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: viArray,
    },
    aesKey,
    new Uint8Array(base64ToArrayBuffer(encryptedData)),
  )
  return new TextDecoder().decode(decryptedData)
}
