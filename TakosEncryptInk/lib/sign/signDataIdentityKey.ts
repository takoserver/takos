import type {
  IdentityKeyPrivateObject,
  IdentityKeyPublicObject,
} from "../../types/keys.ts";
import { sign, verify } from "../../utils/sign.ts";
import {
  isValidIdentityPrivateKey,
  isValidIdentityPublicKey,
} from "../isValid.ts/identityKey.ts";
import { isValidSign } from "../isValid.ts/sign.ts";

export async function signDataIdentityKey(data: string, key: {
  public: string;
  private: string;
}): Promise<string> {
  const masterKeyPublic: IdentityKeyPublicObject = JSON.parse(key.public);
  const masterKeyPrivate: IdentityKeyPrivateObject = JSON.parse(key.private);
  if (!isValidIdentityPrivateKey(JSON.stringify(masterKeyPrivate))) {
    throw new Error("Invalid Master Key");
  }
  if (!isValidIdentityPublicKey(JSON.stringify(masterKeyPublic))) {
    throw new Error("Invalid Master Key");
  }
  return JSON.stringify(
    await sign({
      public: masterKeyPublic.key,
      private: masterKeyPrivate.key,
    }, data),
  );
}

export function verifyDataIdentityKey(
  data: string,
  key: string,
  sign: string,
): boolean {
  const masterKeyPublic: IdentityKeyPublicObject = JSON.parse(key);
  if (!isValidIdentityPublicKey(key)) throw new Error("Invalid Master Key");
  if (!isValidSign(sign)) throw new Error("Invalid Sign");
  const signature = JSON.parse(sign);
  return verify(masterKeyPublic.key, data, signature);
}
