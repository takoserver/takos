import type { Sign } from "./types.ts"
import { digestMessage } from "./utils/hash.ts"
import { exportfromJWK } from "./import.ts"
import { decodeBase64, encodeBase64 } from "./keys/base64.ts" // decodeBase64をインポート

// 鍵を署名する関数
export async function signKey(
  key: CryptoKey,
  data: JsonWebKey,
  type: "master" | "identity",
): Promise<Sign> {
  const masterKeyHash = await digestMessage(JSON.stringify(exportfromJWK(key)))
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  )
  console.log(encodeBase64(signature))
  return {
    signature: encodeBase64(signature),
    hashedPublicKeyHex: masterKeyHash,
    type,
  }
}

// 鍵を検証する関数
export async function verifyKey(
  key: JsonWebKey,
  sign: Sign,
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    key,
    { name: "RSA-PSS", hash: { name: "SHA-256" } },
    true,
    ["verify"],
  )
  console.log(sign.signature)
  return await crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    importedKey,
    new TextEncoder().encode(JSON.stringify(key)),
    decodeBase64(sign.signature), // 修正箇所
  )
}

// 鍵の有効期限の署名をする関数
export async function signKeyExpiration(
  key: CryptoKey,
  expiration: Date,
  type: "master" | "identity",
): Promise<Sign> {
  const masterKeyHash = await digestMessage(JSON.stringify(exportfromJWK(key)))
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    key,
    new TextEncoder().encode(expiration.toISOString()),
  )
  return {
    signature: encodeBase64(signature),
    hashedPublicKeyHex: masterKeyHash,
    type,
  }
}

// 鍵の有効期限を検証する関数
export async function verifyKeyExpiration(
  key: JsonWebKey,
  sign: Sign,
): Promise<boolean> {
  const importedKey = await crypto.subtle.importKey(
    "jwk",
    key,
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
    new TextEncoder().encode(sign.hashedPublicKeyHex),
    decodeBase64(sign.signature), // 修正箇所
  )
}
