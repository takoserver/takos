export interface KeyShareKeyPub {
  key: string
  keyType: "keySharePub" // 鍵の種類
  timestamp: string // 鍵の作成日時
  version: number // 鍵のバージョン
}
export interface KeyShareKeyPrivate {
  key: string
  keyType: "keySharePrivate" // 鍵の種類
  version: number // 鍵のバージョン
}
export interface KeyShareKey {
  public: KeyShareKeyPub // 公開鍵情報
  private: KeyShareKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
  version: number // 鍵のバージョン
}

export interface KeyShareSignKeyPub {
  key: string
  timestamp: string
  keyType: "keyShareSignPub" // 鍵の種類
  version: number // 鍵のバージョン
}

export interface KeyShareSignKeyPrivate {
  key: string
  keyType: "keyShareSignPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}

export interface KeyShareSignKey {
  public: KeyShareSignKeyPub
  private: KeyShareSignKeyPrivate
  hashHex: string
  version: number
}
