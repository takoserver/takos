import type {
  MasterKeyPrivateObject,
  MasterKeyPublicObject,
} from "../../types/keys.ts";
import { sign, verify } from "../../utils/sign.ts";
import {
  isValidMasterKeyPriv,
  isValidMasterKeyPub,
} from "../isValid.ts/masterKey.ts";
import { isValidSign } from "../isValid.ts/sign.ts";

export async function signDataMasterKey(data: string, key: {
  public: string;
  private: string;
}): Promise<string> {
  const masterKeyPublic: MasterKeyPublicObject = JSON.parse(key.public);
  const masterKeyPrivate: MasterKeyPrivateObject = JSON.parse(key.private);
  if (!isValidMasterKeyPriv(JSON.stringify(masterKeyPrivate))) {
    throw new Error("Invalid Master Key");
  }
  if (!isValidMasterKeyPub(JSON.stringify(masterKeyPublic))) {
    throw new Error("Invalid Master Key");
  }
  return JSON.stringify(
    await sign({
      public: masterKeyPublic.key,
      private: masterKeyPrivate.key,
    }, data),
  );
}

export function verifyDataMasterKey(
  data: string,
  key: string,
  sign: string,
): boolean {
  const masterKeyPublic: MasterKeyPublicObject = JSON.parse(key);
  if (!isValidMasterKeyPub(key)) throw new Error("Invalid Master Key");
  if (!isValidSign(sign)) throw new Error("Invalid Sign");
  const signature = JSON.parse(sign);
  return verify(masterKeyPublic.key, data, signature);
}
