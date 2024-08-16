import type {
  accountKeyPrivate,
  accountKeyPub,
  identityKeyPrivate,
  identityKeyPub,
} from "./types.ts";

export async function importKey(
  inputKey:
    | identityKeyPub
    | identityKeyPrivate
    | accountKeyPub
    | accountKeyPrivate,
): Promise<CryptoKey> {
  const jwk = inputKey.key;
  const keyType = inputKey.keyType;
  let type: string;
  switch (keyType) {
    case "identityPub":
      type = "RSA-PSS";
      break;
    case "identityPrivate":
      type = "RSA-OAEP";
      break;
    case "accountPub":
      type = "RSA-PSS";
      break;
    case "accountPrivate":
      type = "RSA-OAEP";
      break;
    default:
      throw new Error(`Unsupported keyType: ${keyType}`);
  }
  let key: CryptoKey;
  if (type === "RSA-OAEP") {
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      ["encrypt", "decrypt"],
    );
  } else if (type === "RSA-PSS") {
    key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: type, hash: { name: "SHA-256" } },
      true,
      ["sign", "verify"],
    );
  } else if (type === "AES-GCM") {
    key = await crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, [
      "encrypt",
      "decrypt",
    ]);
  } else {
    throw new Error(`Unsupported type: ${type}`);
  }
  return key;
}
export function exportfromJWK(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}
