export interface migrateKeyPub {
  key: string
  keyType: "migratePub"
  version: number
}

export interface migrateKeyPrivate {
  key: string
  keyType: "migratePrivate"
  version: number
}

export interface migrateKey {
  public: migrateKeyPub
  private: migrateKeyPrivate
  hashHex: string
  version: number
}
