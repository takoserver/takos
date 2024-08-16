type Sign = {
  //arrayBufferをbase64に変換したもの
  signature: string;
  //署名した鍵の公開鍵をhash化し、16進数文字列に変換したもの
  hashedPublicKeyHex: string;
  type: "master" | "identity";
};

type identityKeyPub = {
  key: JsonWebKey;
  sign: Sign;
  keyExpiration: string;
  keyExpirationSign: Sign;
  keyType: "identityPub";
};

type identityKeyPrivate = {
  key: JsonWebKey;
  keyExpiration: string;
  keyType: "identityPrivate";
};

type accountKeyPub = {
  key: JsonWebKey;
  sign: Sign;
  keyExpiration: string;
  keyExpirationSign: Sign;
  keyType: "accountPub";
};

type accountKeyPrivate = {
  key: JsonWebKey;
  keyExpiration: string;
  keyType: "accountPrivate";
};

type accountKey = {
    public: accountKeyPub;
  private: accountKeyPrivate;
};

type identityKey = {
    public: identityKeyPub;
  private: identityKeyPrivate;
};

type OtherUserMasterKeys = [{
  key: JsonWebKey;
  hashHex: string;
}];

type OtherUserIdentityKeys = [{
  key: JsonWebKey;
  hashHex: string;
}];

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
};
