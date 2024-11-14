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
    keyType: "shareKeyPublic" | "shareKeyPrivate"
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
  } 
export interface migrateSignKey {
    keyType: "migrateSignKeyPublic" | "migrateSignKeyPrivate"
    key: string
}

export interface Sign {
  keyHash: string
  signature: string
  keyType: string
}

export interface EncryptedData {
  keyType: string
  keyHash: string
  encryptedData: string
  iv: string
  cipherText?: string
}

export interface deviceKey {
  keyType: "deviceKey"
  key: string
}