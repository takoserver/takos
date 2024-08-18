//アルゴリズムはrsa-pss 鍵長は2048
import type { identityKey, identityKeyPrivate, identityKeyPub, Sign } from "../types.ts"
import { exportfromJWK } from "../import.ts"
import { signKey, signKeyExpiration } from "../SignKey.ts"
import { digestMessage } from "../utils/hash.ts"

export async function generateIdentityKey(
  masterKeyPub: CryptoKey,
  masterKeyPriv: CryptoKey,
): Promise<identityKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )
  const publicKeyJWK = await exportfromJWK(keyPair.publicKey)
  const privateKeyJWK = await exportfromJWK(keyPair.privateKey)
  const keyExpiration = new Date()
  keyExpiration.setFullYear(keyExpiration.getFullYear() + 1)
  const publicKey: identityKeyPub = {
    key: publicKeyJWK,
    keyType: "identityPub",
    keyExpiration: keyExpiration.toISOString(),
    sign: await signKey(masterKeyPriv, publicKeyJWK, "master"),
    keyExpirationSign: await signKeyExpiration(masterKeyPriv, keyExpiration, "master"),
  }
  const privateKey: identityKeyPrivate = {
    key: privateKeyJWK,
    keyType: "identityPrivate",
  }
  const result: identityKey = {
    public: publicKey,
    private: privateKey,
    hashHex: await digestMessage(JSON.stringify(publicKeyJWK)),
  }
  return result
}

export function signIdentityKey(
  privateKey: CryptoKey,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    data,
  )
}

export function verifyIdentityKey(
  publicKey: CryptoKey,
  signature: ArrayBuffer,
  data: ArrayBuffer,
): Promise<boolean> {
  return crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    signature,
    data,
  )
}
