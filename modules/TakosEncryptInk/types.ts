// 署名情報を格納する型
type Sign = {
  signature: string; // ArrayBufferをbase64に変換したもの
  hashedPublicKeyHex: string; // 公開鍵をハッシュ化し、16進数文字列に変換したもの
  type: "master" | "identity"; //
  version: number; // 署名のバージョン
};

// Identity Keyの公開鍵情報を格納する型
type IdentityKeyPub = {
  key: JsonWebKey; // 公開鍵
  sign: Sign; // 署名情報
  keyExpiration: string; // 鍵の有効期限
  keyExpirationSign: Sign; // 有効期限に対する署名
  keyType: "identityPub"; // 鍵の種類
  version: number; // 鍵のバージョン
};

// Identity Keyの秘密鍵情報を格納する型
type IdentityKeyPrivate = {
  key: JsonWebKey; // 秘密鍵
  keyType: "identityPrivate"; // 鍵の種類
  version: number; // 鍵のバージョン
};

// Account Keyの公開鍵情報を格納する型
type AccountKeyPub = {
  key: JsonWebKey; // 公開鍵
  sign: Sign; // 署名情報
  keyType: "accountPub"; // 鍵の種類
  version: number; // 鍵のバージョン
};

// Account Keyの秘密鍵情報を格納する型
type AccountKeyPrivate = {
  key: JsonWebKey; // 秘密鍵
  keyType: "accountPrivate"; // 鍵の種類
  version: number; // 鍵のバージョン
};

// Account Keyのペア情報を格納する型
type AccountKey = {
  public: AccountKeyPub; // 公開鍵情報
  private: AccountKeyPrivate; // 秘密鍵情報
  hashHex: string; // 鍵のハッシュ
  version: number; // 鍵のバージョン
};

// Identity Keyのペア情報を格納する型
type IdentityKey = {
  public: IdentityKeyPub; // 公開鍵情報
  private: IdentityKeyPrivate; // 秘密鍵情報
  hashHex: string; // 鍵のハッシュ
  version: number; // 鍵のバージョン
};

type MasterKey = {
  public: MasterKeyPub;
  private: MasterKeyPrivate;
  hashHex: string;
  version: number;
};

type MasterKeyPub = {
  key: JsonWebKey;
  keyType: "masterPub";
  version: number;
};
type MasterKeyPrivate = {
  key: JsonWebKey;
  keyType: "masterPrivate";
  version: number;
};

// 他のユーザーのMaster Key情報を格納する型
type OtherUserMasterKeys = {
  key: JsonWebKey; // 公開鍵
  hashHex: string; // 鍵のハッシュ
  version: number; // 鍵のバージョン
}[];

type deviceKeyPub = {
  key: JsonWebKey;
  sign: Sign;
  keyType: "devicePub";
  version: number;
};

type deviceKeyPrivate = {
  key: JsonWebKey;
  sign: Sign;
  keyType: "devicePrivate";
  version: number;
};

type deviceKey = {
  public: deviceKeyPub;
  private: deviceKeyPrivate;
  hashHex: string;
  version: number;
};

type RoomKey = {
  key: JsonWebKey;
  sign: Sign;
  keyType: "roomKey";
  keyExpiration: string;
  keyExpirationSign: Sign;
  hashHex: string;
  version: number;
};

type EncryptedData = {
  encryptedData: string[];
  keyType: "accountKey"; // 使用された鍵の種類
  encryptedDataSign: Sign; // 暗号化されたデータをJSON.stringifyしたものに対する署名
  //暗号化した鍵のハッシュ値
  encryptedKeyHashHex: string;
  iv?: string; // 初期化ベクトル (Initialization Vector)
  //署名した鍵のハッシュ値
  signKeyHashHex: string;
  version: number;
};

type EncryptedDataAccountKey = {
  encryptedData: string[];
  keyType: "accountKey"; // 使用された鍵の種類
  //暗号化した鍵のハッシュ値
  encryptedKeyHashHex: string;
  iv?: string; // 初期化ベクトル (Initialization Vector)
  version: number;
};

type EncryptedDataRoomKey = {
  encryptedData: string;
  keyType: "roomKey";
  iv?: string;
  encryptedDataSign: Sign;
  encryptedKeyHashHex: string;
  signKeyHashHex: string;
  version: number;
};

type EncryptedDataDeviceKey = {
  encryptedData: string[]; // 暗号化されたデータの値
  keyType: "DeviceKey"; // 使用された鍵の種類
  iv?: string; // 初期化ベクトル (Initialization Vector)
  encryptedKeyHashHex: string; //暗号化した鍵のハッシュ値
  version: number;
};

type HashChainElement = {
  hash: string;
  sign: Sign;
  version: number;
};

type OtherUserIdentityKeys = {
  identityKey: IdentityKeyPub;
  hashHex: string;
  hashChain: HashChainElement;
  version: number;
}[];

type KeyShareKeyPub = {
  key: JsonWebKey; // 公開鍵
  sign: Sign; // 署名情報
  keyType: "keySharePub"; // 鍵の種類
  keyExpiration: string; // 鍵の有効期限
  keyExpirationSign: Sign; // 有効期限に対する署名
  version: number; // 鍵のバージョン
};
type KeyShareKeyPrivate = {
  key: JsonWebKey; // 秘密鍵
  keyType: "keySharePrivate"; // 鍵の種類
};
type KeyShareKey = {
  public: KeyShareKeyPub; // 公開鍵情報
  private: KeyShareKeyPrivate; // 秘密鍵情報
  hashHex: string; // 鍵のハッシュ
  version: number; // 鍵のバージョン
};

type EncryptedDataKeyShareKey = {
  encryptedData: string[]; // 暗号化されたデータの値
  keyType: "keyShareKey"; // 使用された鍵の種類
  encryptedDataSign: Sign; //暗号化されたデータに対する署名
  encryptedKeyHashHex: string; //暗号化した鍵のハッシュ値
  signKeyHashHex: string; //署名した鍵のハッシュ値
  iv?: string; // 初期化ベクトル (Initialization Vector)
  version: number;
};

type migrateKeyPub = {
  key: JsonWebKey;
  keyType: "migratePub";
  version: number;
};

type migrateKeyPrivate = {
  key: JsonWebKey;
  keyType: "migratePrivate";
  version: number;
};

type migrateKey = {
  public: migrateKeyPub;
  private: migrateKeyPrivate;
  hashHex: string;
  version: number;
};

type migrateDataSignKeyPub = {
  key: JsonWebKey;
  keyType: "migrateDataSignPub";
  version: number;
};
type migrateDataSignKeyPrivate = {
  key: JsonWebKey;
  keyType: "migrateDataSignPrivate";
  version: number;
};
type migrateDataSignKey = {
  public: migrateDataSignKeyPub;
  private: migrateDataSignKeyPrivate;
  hashHex: string;
  version: number;
};

type Message = {
  message: string;
  type: "text" | "image" | "video" | "audio";
  timestamp: string;
  version: number;
};

// 型定義のエクスポート
export type {
  AccountKey,
  AccountKeyPrivate,
  AccountKeyPub,
  deviceKey,
  deviceKeyPrivate,
  deviceKeyPub,
  EncryptedData,
  EncryptedDataAccountKey,
  EncryptedDataDeviceKey,
  EncryptedDataKeyShareKey,
  EncryptedDataRoomKey,
  HashChainElement,
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
  OtherUserIdentityKeys,
  OtherUserMasterKeys,
  RoomKey,
  Sign,
};
