import {
  migrateKeyPrivateObject,
  migrateKeyPublicObject,
  migrateSignKeyPrivateObject,
  migrateSignKeyPublicObject,
} from "../../types/keys.ts"
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import { arrayBufferToBase64, base64ToArrayBuffer } from "../../utils/buffers.ts"
import { ml_kem768 } from "@noble/post-quantum/ml-kem"

export function migrateSignKeyObject(): {
  public: migrateSignKeyPublicObject
  private: migrateSignKeyPrivateObject
} {
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const key = ml_dsa65.keygen(seed)
  return {
    public: {
      key: arrayBufferToBase64(key.publicKey),
      type: "migrateSignKeyPublic",
      version: 1,
    },
    private: {
      key: arrayBufferToBase64(key.secretKey),
      type: "migrateSignKeyPrivate",
      version: 1,
    },
  }
}

export function migrateKeyObject(): {
  public: migrateKeyPublicObject
  private: migrateKeyPrivateObject
} {
  const key = ml_kem768.keygen()
  return {
    public: {
      key: arrayBufferToBase64(key.publicKey),
      type: "migrateKeyPublic",
      version: 1,
    },
    private: {
      key: arrayBufferToBase64(key.secretKey),
      type: "migrateKeyPrivate",
      version: 1,
    },
  }
}
export function migrateKey(): { public: string; private: string } {
  const keys = migrateKeyObject()
  return { public: JSON.stringify(keys.public), private: JSON.stringify(keys.private) }
}

export function migrateSignKey(): { public: string; private: string } {
  const keys = migrateSignKeyObject()
  return { public: JSON.stringify(keys.public), private: JSON.stringify(keys.private) }
}
