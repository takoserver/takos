# Identity Key

identityKeyのデータ型

```typescript
//timestampはISO8601形式の文字列
type IdentityKey = {
  public: IdentityKeyPub
  private: IdentityKeyPrivate
  hashHex: string // 公開鍵のハッシュ
  version: number // 鍵のバージョン
}

type IdentityKeyPub = {
  key: string // 公開鍵をbase64エンコードしたもの
  sign: Sign // masterKeyで公開鍵を署名したもの
  timestamp: string // 鍵の作成日時
  timestampSign: string // 鍵の作成日時に対する署名
  keyType: "identityPub" // 鍵の種類
  version: number // 鍵のバージョン
}

// Identity Keyの秘密鍵情報を格納する型
type IdentityKeyPrivate = {
  key: string // 秘密鍵
  keyType: "identityPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}
```

masterKeyによって署名され、信用はmasterKeyによって確認されます。
主に様々なデータの署名に使用されます。

アルゴリズムはml_dsa65を使用します。
