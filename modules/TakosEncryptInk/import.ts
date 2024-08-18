import type {
  accountKeyPrivate,
  accountKeyPub,
  identityKeyPrivate,
  identityKeyPub,
} from "./types.ts"

export async function importKey(
  inputKey:
    | identityKeyPub
    | identityKeyPrivate
    | accountKeyPub
    | accountKeyPrivate,
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

export function exportfromJWK(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key)
}
