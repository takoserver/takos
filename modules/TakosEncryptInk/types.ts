type Sign = {
  //arrayBufferをbase64に変換したもの
  signature: string
  //署名した鍵の公開鍵をhash化し、16進数文字列に変換したもの
  hashedPublicKeyHex: string
  type: "master" | "identity"
}

//identityKeyの型

type identityKeyPub = {
  key: JsonWebKey
  sign: Sign
  keyExpiration: string
  keyExpirationSign: Sign
  keyType: "identityPub"
}

type identityKeyPrivate = {
  key: JsonWebKey
  keyType: "identityPrivate"
}

//accountKeyの型
type accountKeyPub = {
  key: JsonWebKey
  sign: Sign
  keyType: "accountPub"
}

type accountKeyPrivate = {
  key: JsonWebKey
  keyType: "accountPrivate"
}

type accountKey = {
  public: accountKeyPub
  private: accountKeyPrivate
  hashHex: string
}

type identityKey = {
  public: identityKeyPub
  private: identityKeyPrivate
  hashHex: string
}

type OtherUserMasterKeys = [{
  key: JsonWebKey
  hashHex: string
}]

type OtherUserIdentityKeys = [{
  key: JsonWebKey
  hashHex: string
}]

export type {
  accountKey,
  accountKeyPrivate,
  accountKeyPub,
  identityKey,
  identityKeyPrivate,
  identityKeyPub,
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  Sign,
}
