//アルゴリズムはrsa-oaep 鍵長は2048
import type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  Sign,
} from "../types.ts";
import { signIdentityKey } from "./identityKey.ts";
import { exportfromJWK } from "../import.ts";
import { digestMessage } from "../utils/hash.ts";
import { encodeBase64 } from "./base64.ts";

export async function generateAccountKey(
  identityKeyPub: CryptoKey,
  identityKeyPriv: CryptoKey,
): Promise<accountKey> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const publicKeyJWK = await exportfromJWK(keyPair.publicKey);
  const privateKeyJWK = await exportfromJWK(keyPair.privateKey);
  const signature = await signIdentityKey(
    identityKeyPriv,
    new TextEncoder().encode(JSON.stringify(publicKeyJWK)),
  );
  const masterKeyJWK = await exportfromJWK(identityKeyPub);
  const masterKeyHash = await digestMessage(JSON.stringify(masterKeyJWK));
  const keyExpiration = new Date();
  keyExpiration.setFullYear(keyExpiration.getFullYear() + 1);
  const publicKey: accountKeyPub = {
    key: publicKeyJWK,
    keyType: "accountPub",
    keyExpiration: keyExpiration.toISOString(),
    sign: {
      signature: encodeBase64(signature),
      hashedPublicKeyHex: masterKeyHash,
      type: "master",
    },
    keyExpirationSign: {
      signature: encodeBase64(
        await signIdentityKey(
          identityKeyPriv,
          new TextEncoder().encode(keyExpiration.toISOString()),
        ),
      ),
      hashedPublicKeyHex: masterKeyHash,
      type: "identity",
    },
  };
  const privateKey: accountKeyPrivate = {
    key: privateKeyJWK,
    keyType: "accountPrivate",
    keyExpiration: keyExpiration.toISOString(),
  };
  return {
    public: publicKey,
    private: privateKey,
  };
}

export function signAccountKey(
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
  );
}

export function verifyAccountKey(
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
  );
}

//期限切れかどうかを判定する関数
