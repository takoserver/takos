export type MasterKey = {
  public: MasterKeyPub
  private: MasterKeyPrivate
  hashHex: string
  version: number
}

export type MasterKeyPub = {
  key: string
  keyType: "masterPub"
  version: number
}

export type MasterKeyPrivate = {
  key: string
  keyType: "masterPrivate"
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
