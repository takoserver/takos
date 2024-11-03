export interface MasterKeyPublicObject {
  key: string;
  type: "MasterKeyPublic";
  timestamp: string;
}

export interface SingObject {
  signature: string;
  signedKeyHash: string;
}

export interface MasterKeyPrivateObject {
  key: string;
  type: "MasterKeyPrivate";
  timestamp: string;
}

export interface IdentityKeyPublicObject {
  key: string;
  timestamp: string;
  type: "IdentityKeyPublic";
  version: number;
}

export interface IdentityKeyPrivateObject {
  key: string;
  timestamp: string;
  type: "IdentityKeyPrivate";
  version: number;
}

export interface AccountKeyPublicObject {
  key: string;
  type: "AccountKeyPublic";
  version: number;
}

export interface AccountKeyPrivateObject {
  key: string;
  type: "AccountKeyPrivate";
  version: number;
}

export interface deviceKeyObject {
  key: string;
  type: "deviceKey";
  version: number;
}

export interface roomKeyObject {
  key: string;
  timestamp: string;
  type: "roomKey";
  version: number;
  masterKeysHashHex: {
    [key: string]: string;
  };
}

export interface KeyShareKeyPublicObject {
  key: string;
  type: "KeyShareKeyPublic";
  version: number;
  uuidv7: string; //uuidv7
}

export interface KeyShareKeyPrivateObject {
  key: string;
  type: "KeyShareKeyPrivate";
  version: number;
  uuidv7: string; //uuidv7
}

export interface keyShareSignKeyPublicObject {
  key: string;
  type: "keyShareSignKeyPublic";
  version: number;
  uuidv7: string; //uuidv7
}

export interface keyShareSignKeyPrivateObject {
  key: string;
  type: "keyShareSignKeyPrivate";
  version: number;
  uuidv7: string; //uuidv7
}

export interface migrateKeyPublicObject {
  key: string;
  type: "migrateKeyPublic";
  version: number;
}

export interface migrateKeyPrivateObject {
  key: string;
  type: "migrateKeyPrivate";
  version: number;
}

export interface migrateSignKeyPublicObject {
  key: string;
  type: "migrateSignKeyPublic";
  version: number;
}

export interface migrateSignKeyPrivateObject {
  key: string;
  type: "migrateSignKeyPrivate";
  version: number;
}
