
import type { EncryptedDataKeyShareKeyObject, } from "../../types/EncryptedData.ts"
import type { KeyShareKeyPublicObject,KeyShareKeyPrivateObject} from "../../types/keys.ts"
import { decrypt, encrypt } from "../../utils/encrypt.ts"
import { keyHash } from "../../utils/keyHash.ts"

export async function EncryptDataKeyShareKeyRaw(
  data: string,
  accountKey: string,
): Promise<EncryptedDataKeyShareKeyObject> {
  const accountKeyPublic: KeyShareKeyPublicObject = JSON.parse(accountKey)
  const encryptedData = await encrypt(data, accountKeyPublic.key)
  const hash = await keyHash(accountKey)
  return {
    encryptedData: encryptedData.encryptedData,
    cipherText: encryptedData.chipherText,
    vi: encryptedData.vi,
    encryptedKeyHash: hash,
    type: "KeyShareKey",
    version: 1,
  }
}

export async function EncryptDataKeyShareKey(
  data: string,
  accountKey: string,
): Promise<string> {
  return JSON.stringify(await EncryptDataKeyShareKeyRaw(data, accountKey))
}

export async function DecryptDataKeyShareKey(
  encryptedData: string,
  accountKey: string,
): Promise<string> {
  const accountKeyPrivate: KeyShareKeyPrivateObject = JSON.parse(accountKey)
  const encryptedDataObject: EncryptedDataKeyShareKeyObject = JSON.parse(encryptedData)
  if (encryptedDataObject.type !== "KeyShareKey") throw new Error("Invalid type")
  if (encryptedDataObject.version !== 1) throw new Error("Invalid version")
  return await decrypt(
    encryptedDataObject.encryptedData,
    encryptedDataObject.cipherText,
    encryptedDataObject.vi,
    accountKeyPrivate.key,
  )
}
