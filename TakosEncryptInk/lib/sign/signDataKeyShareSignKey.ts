import type { keyShareSignKeyPrivateObject, keyShareSignKeyPublicObject } from "../../types/keys.ts"
import { sign, verify } from "../../utils/sign.ts"
import { isValidkeyShareSignKeyPrivate, isValidkeyShareSignKeyPublic } from "../isValid.ts/keyShareKey.ts"
import { isValidSign } from "../isValid.ts/sign.ts"

export function signDataKeyShareKey(data: string, key: {
  public: string
  private: string
}) {
  const masterKeyPublic: keyShareSignKeyPublicObject = JSON.parse(key.public)
  const masterKeyPrivate: keyShareSignKeyPrivateObject = JSON.parse(key.private)
  if (!isValidkeyShareSignKeyPrivate(JSON.stringify(masterKeyPrivate))) {
    throw new Error("Invalid Master Key")
  }
  if (!isValidkeyShareSignKeyPublic(JSON.stringify(masterKeyPublic))) {
    throw new Error("Invalid Master Key")
  }
  return sign({
    public: masterKeyPublic.key,
    private: masterKeyPrivate.key,
  }, data)
}

export function verifyDataKeyShareKey(data: string, key: string, sign: string) {
  const masterKeyPublic: keyShareSignKeyPublicObject = JSON.parse(key)
  if (!isValidkeyShareSignKeyPublic(key)) throw new Error("Invalid Master Key")
  if (!isValidSign(sign)) throw new Error("Invalid Sign")
  const signature = JSON.parse(sign)
  return verify(masterKeyPublic.key, data, signature)
}
