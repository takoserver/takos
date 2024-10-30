import type { EncryptedDataMigrateKeyObject } from "../../types/EncryptedData.ts"
import type { migrateKeyPrivateObject, migrateKeyPublicObject } from "../../types/keys.ts"
import { decrypt, encrypt } from "../../utils/encrypt.ts"
import { keyHash } from "../../utils/keyHash.ts"

export async function EncryptDataMigrateKeyRaw(
  data: string,
  accountKey: string,
): Promise<EncryptedDataMigrateKeyObject> {
  const accountKeyPublic: migrateKeyPublicObject = JSON.parse(accountKey)
  const encryptedData = await encrypt(data, accountKeyPublic.key)
  const hash = await keyHash(accountKey)
  return {
    encryptedData: encryptedData.encryptedData,
    cipherText: encryptedData.chipherText,
    vi: encryptedData.vi,
    encryptedKeyHash: hash,
    type: "MigrateKey",
    version: 1,
  }
}

export async function EncryptDataMigrateKey(
  data: string,
  accountKey: string,
): Promise<string> {
  return JSON.stringify(await EncryptDataMigrateKeyRaw(data, accountKey))
}

export async function DecryptDataMigrateKey(
  encryptedData: string,
  accountKey: string,
): Promise<string> {
  const accountKeyPrivate: migrateKeyPrivateObject = JSON.parse(accountKey)
  const encryptedDataObject: EncryptedDataMigrateKeyObject = JSON.parse(encryptedData)
  if (encryptedDataObject.type !== "MigrateKey") throw new Error("Invalid type")
  if (encryptedDataObject.version !== 1) throw new Error("Invalid version")
  return await decrypt(
    encryptedDataObject.encryptedData,
    encryptedDataObject.cipherText,
    encryptedDataObject.vi,
    accountKeyPrivate.key,
  )
}
