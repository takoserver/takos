export interface masterKey {
    keyType: "masterKeyPublic" | "masterKeyPrivate"
    key: string
  } 
export interface identityKey {
    keyType: "identityKeyPublic" | "identityKeyPrivate"
    key: string
    timestamp: number
    sessionUuid: string
  } 
export interface accountKey {
    keyType: "accountKeyPublic" | "accountKeyPrivate"
    key: string
    timestamp: number
  } 
export interface roomKey {
    keyType: "roomKey"
    key: string
    timestamp: number
    sessionUuid: string
  } 
export interface shareKey {
    keyType: "shareKeyPublic" | "sharekeyPrivate"
    key: string
    timestamp: number
    sessionUuid: string
  } 

export interface shareSignKey {
    keyType: "shareSignKeyPublic" | "shareSignKeyPrivate"
    key: string
    timestamp: number
    sessionUuid: string
  } 
export interface migrateKey {
    keyType: "migrateKeyPublic" | "migrateKeyPrivate"
    key: string
    timestamp: number
  } 
export interface migrateSignKey {
    keyType: "migrateSignKeyPublic" | "migrateSignKeyPrivate"
    key: string
    timestamp: number
}

export interface Sign {
  keyHash: string
  signature: string
  keyType: string
}