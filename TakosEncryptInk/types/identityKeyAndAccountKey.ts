export type IdentityKey = {
  public: IdentityKeyPub
  private: IdentityKeyPrivate
  hashHex: string
  version: number
}

export type IdentityKeyPub = {
  key: string
  timestamp: string
  keyType: "identityPub"
  version: number
}

export type IdentityKeyPrivate = {
  key: string // 秘密鍵
  keyType: "identityPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}

export type AccountKeyPub = {
  key: string
  keyType: "accountPub"
  version: number
}

export type AccountKeyPrivate = {
  key: string
  keyType: "accountPrivate"
  version: number
}

export type AccountKey = {
  public: AccountKeyPub
  private: AccountKeyPrivate
  hashHex: string
  version: number
}
