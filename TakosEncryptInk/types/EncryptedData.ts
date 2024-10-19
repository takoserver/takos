export interface EncryptedDataAccountKey {
  encryptedData: string
  keyType: "accountKey" // 使用された鍵の種類
  //暗号化した鍵のハッシュ値
  cipherText: string //共有秘密を生み出すための暗号文
  encryptedKeyHashHex: string
  version: number
  vi?: string
}

export interface EncryptedDataRoomKey {
  encryptedData: string
  keyType: "roomKey"
  encryptedKeyHashHex: string
  version: number
  vi?: string
}

export interface EncryptedDataDeviceKey {
  encryptedData: string
  keyType: "DeviceKey"
  encryptedKeyHashHex: string
  version: number
  vi?: string
}

export interface EncryptedDataKeyShareKey {
  encryptedData: string
  keyType: "keyShareKey"
  encryptedKeyHashHex: string
  signKeyHashHex: string
  version: number
  cipherText: string
  vi?: string
}
