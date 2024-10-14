// 署名情報を格納する型
type Sign = {
  signature: string // ArrayBufferをbase64に変換したもの
  hashedPublicKeyHex: string // 公開鍵をハッシュ化し、16進数文字列に変換したもの
  version: number // 署名のバージョン
}
type MasterKey = {
  public: MasterKeyPub
  private: MasterKeyPrivate
  hashHex: string
  version: number
}

type MasterKeyPub = {
  key: string
  keyType: "masterPub"
  version: number
}

type MasterKeyPrivate = {
  key: string
  keyType: "masterPrivate"
  version: number
}

type IdentityKey = {
  public: IdentityKeyPub
  private: IdentityKeyPrivate
  hashHex: string
  version: number
}

type IdentityKeyPub = {
  key: string
  sign: Sign
  timestamp: string
  keyType: "identityPub"
  version: number
}

// Identity Keyの秘密鍵情報を格納する型
type IdentityKeyPrivate = {
  key: string // 秘密鍵
  keyType: "identityPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}

type AccountKeyPub = {
  key: string
  sign: Sign
  keyType: "accountPub"
  version: number
}

type AccountKeyPrivate = {
  key: string
  keyType: "accountPrivate"
  version: number
}

type AccountKey = {
  public: AccountKeyPub
  private: AccountKeyPrivate
  hashHex: string
  version: number
}

type deviceKey = {
  key: string
  keyType: "deviceKey"
  version: number
}

interface RoomKey {
  key: string
  sign: Sign
  keyType: "roomKey"
  timestamp: string // 鍵の作成日時
  hashHex: string
  version: number
}

interface KeyShareKeyPub {
  key: string
  sign: Sign // 署名情報
  keyType: "keySharePub" // 鍵の種類
  timestamp: string // 鍵の作成日時
  version: number // 鍵のバージョン
}
interface KeyShareKeyPrivate {
  key: string
  keyType: "keySharePrivate" // 鍵の種類
}
interface KeyShareKey {
  public: KeyShareKeyPub // 公開鍵情報
  private: KeyShareKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
  version: number // 鍵のバージョン
}

//37度軍事境界線

interface EncryptedDataAccountKey {
  encryptedData: string
  keyType: "accountKey" // 使用された鍵の種類
  //暗号化した鍵のハッシュ値
  cipherText: string //共有秘密を生み出すための暗号文
  encryptedKeyHashHex: string
  version: number
}

interface EncryptedDataRoomKey {
  encryptedData: string
  keyType: "roomKey"
  iv: string
  encryptedKeyHashHex: string
  version: number
}

interface EncryptedDataDeviceKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "DeviceKey" // 使用された鍵の種類
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  version: number
  cipherText: string //共有秘密を生み出すための暗号文
}

interface EncryptedDataKeyShareKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "keyShareKey" // 使用された鍵の種類
  encryptedDataSign: Sign //暗号化されたデータに対する署名
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  signKeyHashHex: string //署名した鍵のハッシュ値
  version: number
  cipherText: string //共有秘密を生み出すための暗号文
}

interface migrateKeyPub {
  key: string
  keyType: "migratePub"
  version: number
}

interface migrateKeyPrivate {
  key: string
  keyType: "migratePrivate"
  version: number
}

interface migrateKey {
  public: migrateKeyPub
  private: migrateKeyPrivate
  hashHex: string
  version: number
}

interface migrateDataSignKeyPub {
  key: string
  keyType: "migrateDataSignPub"
  version: number
}

interface migrateDataSignKeyPrivate {
  key: string
  keyType: "migrateDataSignPrivate"
  version: number
}

interface migrateDataSignKey {
  public: migrateDataSignKeyPub
  private: migrateDataSignKeyPrivate
  hashHex: string
  version: number
}

interface Message {
  message: string
  type: "text" | "image" | "video" | "audio" | "file"
  version: number
  timestamp: string
}
type EncryptedMessage = {
  value: {
    data: EncryptedDataRoomKey
    timestamp: string
  }
  signature: Sign
}
// 型定義のエクスポート
export type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  EncryptedDataAccountKey,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  EncryptedMessage,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  KeyShareKey,
  KeyShareKeyPrivate,
  KeyShareKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  Message,
  migrateDataSignKey,
  migrateDataSignKeyPrivate,
  migrateDataSignKeyPub,
  migrateKey,
  migrateKeyPrivate,
  migrateKeyPub,
  RoomKey,
  Sign,
}
