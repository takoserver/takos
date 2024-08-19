// 署名情報を格納する型
type Sign = {
  signature: string // ArrayBufferをbase64に変換したもの
  hashedPublicKeyHex: string // 公開鍵をハッシュ化し、16進数文字列に変換したもの
  type: "master" | "identity" // 署名の種類
}

// Identity Keyの公開鍵情報を格納する型
type IdentityKeyPub = {
  key: JsonWebKey // 公開鍵
  sign: Sign // 署名情報
  keyExpiration: string // 鍵の有効期限
  keyExpirationSign: Sign // 有効期限に対する署名
  keyType: "identityPub" // 鍵の種類
}

// Identity Keyの秘密鍵情報を格納する型
type IdentityKeyPrivate = {
  key: JsonWebKey // 秘密鍵
  keyType: "identityPrivate" // 鍵の種類
}

// Account Keyの公開鍵情報を格納する型
type AccountKeyPub = {
  key: JsonWebKey // 公開鍵
  sign: Sign // 署名情報
  keyType: "accountPub" // 鍵の種類
}

// Account Keyの秘密鍵情報を格納する型
type AccountKeyPrivate = {
  key: JsonWebKey // 秘密鍵
  keyType: "accountPrivate" // 鍵の種類
}

// Account Keyのペア情報を格納する型
type AccountKey = {
  public: AccountKeyPub // 公開鍵情報
  private: AccountKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
}

// Identity Keyのペア情報を格納する型
type IdentityKey = {
  public: IdentityKeyPub // 公開鍵情報
  private: IdentityKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
}

type MasterKey = {
  public: MasterKeyPub
  private: MasterKeyPrivate
  hashHex: string
}

type MasterKeyPub = {
  key: JsonWebKey
  keyType: "masterPub"
}
type MasterKeyPrivate = {
  key: JsonWebKey
  keyType: "masterPrivate"
}

// 他のユーザーのMaster Key情報を格納する型
type OtherUserMasterKeys = {
  key: JsonWebKey // 公開鍵
  hashHex: string // 鍵のハッシュ
}[]

// 他のユーザーのIdentity Key情報を格納する型
type OtherUserIdentityKeys = {
  key: JsonWebKey // 公開鍵
  hashHex: string // 鍵のハッシュ
}[]

type deviceKeyPub = {
  key: JsonWebKey
  sign: Sign
  keyType: "devicePub"
}

type deviceKeyPrivate = {
  key: JsonWebKey
  sign: Sign
  keyType: "devicePrivate"
}

type deviceKey = {
  public: deviceKeyPub
  private: deviceKeyPrivate
  hashHex: string
}


// 型定義のエクスポート
export type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  IdentityKey,
  IdentityKeyPrivate,
  IdentityKeyPub,
  MasterKey,
  MasterKeyPrivate,
  MasterKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  Sign,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
}
