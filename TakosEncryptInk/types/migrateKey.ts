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

export interface migrateDataSignKeyPub {
  key: string
  keyType: "migrateDataSignPub"
  version: number
}

export interface migrateDataSignKeyPrivate {
  key: string
  keyType: "migrateDataSignPrivate"
  version: number
}

export interface migrateDataSignKey {
  public: migrateDataSignKeyPub
  private: migrateDataSignKeyPrivate
  hashHex: string
  version: number
}
