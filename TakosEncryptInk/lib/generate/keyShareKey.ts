import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { timestamp } from "ui7"
import {
  KeyShareKeyPrivateObject,
  KeyShareKeyPublicObject,
  keyShareSignKeyPrivateObject,
  keyShareSignKeyPublicObject,
  type MasterKeyPrivateObject,
  type MasterKeyPublicObject,
} from "../../types/keys.ts"
import { arrayBufferToBase64 } from "../../utils/buffers.ts"
import { sign } from "../../utils/sign.ts"
import { isValidMasterKeyPriv, isValidMasterKeyPub } from "../isValid.ts/masterKey.ts"
export function generateKeyShareKeyObject(uuid: string): {
  public: KeyShareKeyPublicObject
  private: KeyShareKeyPrivateObject
} {
  if (!isValidUUIDv7(uuid)) {
    throw new Error("Invalid UUIDv7")
  }
  const key = ml_kem768.keygen()
  const publicKeyString = arrayBufferToBase64(key.publicKey)
  const privateKeyString = arrayBufferToBase64(key.secretKey)
  const publicObject: KeyShareKeyPublicObject = {
    key: publicKeyString,
    type: "KeyShareKeyPublic",
    version: 1,
    uuidv7: uuid,
  }
  const privateObject: KeyShareKeyPrivateObject = {
    key: privateKeyString,
    type: "KeyShareKeyPrivate",
    version: 1,
    uuidv7: uuid,
  }
  return { public: publicObject, private: privateObject }
}

export function generateKeyShareSignKeyObject(uuid: string): {
  public: keyShareSignKeyPublicObject
  private: keyShareSignKeyPrivateObject
} {
  if (!isValidUUIDv7(uuid)) {
    throw new Error("Invalid UUIDv7")
  }
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const key = ml_dsa65.keygen(seed)
  const publicKeyString = arrayBufferToBase64(key.publicKey)
  const privateKeyString = arrayBufferToBase64(key.secretKey)
  const publicObject: keyShareSignKeyPublicObject = {
    key: publicKeyString,
    type: "keyShareSignKeyPublic",
    version: 1,
    uuidv7: uuid,
  }
  const privateObject: keyShareSignKeyPrivateObject = {
    key: privateKeyString,
    type: "keyShareSignKeyPrivate",
    version: 1,
    uuidv7: uuid,
  }
  return { public: publicObject, private: privateObject }
}

function isValidUUIDv7(uuid: string): boolean {
  // UUIDv7のフォーマットを確認する正規表現
  const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidv7Regex.test(uuid)
}

export async function generateKeyShareKeys(
  masterKey: { public: string; private: string },
  uuid: string,
): Promise<
  {
    keyShareKey: { public: string; private: string; sign: string }
    keyShareSignKey: { public: string; private: string; sign: string }
  }
> {
  const keyShareKey = generateKeyShareKeyObject(uuid)
  const keyShareSignKey = generateKeyShareSignKeyObject(uuid)
  const keyShareKeyPublic = JSON.stringify(keyShareKey.public)
  const keyShareKeyPrivate = JSON.stringify(keyShareKey.private)
  const keyShareSignKeyPublic = JSON.stringify(keyShareSignKey.public)
  const keyShareSignKeyPrivate = JSON.stringify(keyShareSignKey.private)
  if (isValidMasterKeyPub(masterKey.public) === false) {
    throw new Error("Invalid Master Key")
  }
  if (isValidMasterKeyPriv(masterKey.private) === false) {
    throw new Error("Invalid Master Key")
  }
  const masterKeyPublic: MasterKeyPublicObject = JSON.parse(masterKey.public)
  const masterKeyPrivate: MasterKeyPrivateObject = JSON.parse(masterKey.private)
  const keyShareSign = await sign({
    public: masterKeyPublic.key,
    private: masterKeyPrivate.key,
  }, keyShareKeyPublic)
  const keyShareSignSign = await sign({
    public: masterKeyPublic.key,
    private: masterKeyPrivate.key,
  }, keyShareSignKeyPublic)
  return {
    keyShareKey: {
      public: keyShareKeyPublic,
      private: keyShareKeyPrivate,
      sign: JSON.stringify(keyShareSign),
    },
    keyShareSignKey: {
      public: keyShareSignKeyPublic,
      private: keyShareSignKeyPrivate,
      sign: JSON.stringify(keyShareSignSign),
    },
  }
}
