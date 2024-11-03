import type { EncryptedDataAccountKeyObject } from "../../types/EncryptedData.ts";
import type {
  AccountKeyPrivateObject,
  AccountKeyPublicObject,
} from "../../types/keys.ts";
import { decrypt, encrypt } from "../../utils/encrypt.ts";
import { keyHash } from "../../utils/keyHash.ts";

export async function EncryptDataAccountKeyRaw(
  data: string,
  accountKey: string,
): Promise<EncryptedDataAccountKeyObject> {
  const accountKeyPublic: AccountKeyPublicObject = JSON.parse(accountKey);
  const encryptedData = await encrypt(data, accountKeyPublic.key);
  const hash = await keyHash(accountKey);
  return {
    encryptedData: encryptedData.encryptedData,
    cipherText: encryptedData.chipherText,
    vi: encryptedData.vi,
    encryptedKeyHash: hash,
    type: "accountKey",
    version: 1,
  };
}

export async function EncryptDataAccountKey(
  data: string,
  accountKey: string,
): Promise<string> {
  return JSON.stringify(await EncryptDataAccountKeyRaw(data, accountKey));
}

export async function DecryptDataAccountKey(
  encryptedData: string,
  accountKey: string,
): Promise<string> {
  const accountKeyPrivate: AccountKeyPrivateObject = JSON.parse(accountKey);
  const encryptedDataObject: EncryptedDataAccountKeyObject = JSON.parse(
    encryptedData,
  );
  if (encryptedDataObject.type !== "accountKey") {
    throw new Error("Invalid type");
  }
  if (encryptedDataObject.version !== 1) throw new Error("Invalid version");
  return await decrypt(
    encryptedDataObject.encryptedData,
    encryptedDataObject.cipherText,
    encryptedDataObject.vi,
    accountKeyPrivate.key,
  );
}
