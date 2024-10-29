import type { keyShareSignKeyPublicObject, migrateSignKeyPrivateObject,migrateSignKeyPublicObject } from "../../types/keys.ts"
import { sign, verify } from "../../utils/sign.ts"
import { isValidmigrateSignKeyPrivate,isValidmigrateSignKeyyPublic } from "../isValid.ts/migrateKey.ts"
import { isValidSign } from "../isValid.ts/sign.ts"

export function signDataKeyShareKey(data: string, key: {
  public: string
  private: string
}) {
  const masterKeyPublic: migrateSignKeyPublicObject = JSON.parse(key.public)
  const masterKeyPrivate: migrateSignKeyPrivateObject = JSON.parse(key.private)
  if (!isValidmigrateSignKeyPrivate(JSON.stringify(masterKeyPrivate))) {
    throw new Error("Invalid Master Key")
  }
  if (!isValidmigrateSignKeyyPublic(JSON.stringify(masterKeyPublic))) {
    throw new Error("Invalid Master Key")
  }
  return sign({
    public: masterKeyPublic.key,
    private: masterKeyPrivate.key,
  }, data)
}

export function verifyDataKeyShareKey(data: string, key: string, sign: string) {
  const masterKeyPublic: keyShareSignKeyPublicObject = JSON.parse(key)
  if (!isValidmigrateSignKeyyPublic(key)) throw new Error("Invalid Master Key")
  if (!isValidSign(sign)) throw new Error("Invalid Sign")
  const signature = JSON.parse(sign)
  return verify(masterKeyPublic.key, data, signature)
}