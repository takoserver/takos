# masterKey

masterKeyのデータ型

```typescript
//timestampはISO8601形式の文字列

type MasterKey = {
  public: MasterKeyPub
  private: MasterKeyPrivate
  hashHex: string //公開鍵のハッシュ化したもの
  version: number
}

type MasterKeyPub = {
  key: string // base64エンコードされた公開鍵
  keyType: "masterPub"
  version: number
  timestamp: string
  timestampSign: string // timestampをmasterKeyで署名したものをbase64エンコードしたもの
}
type MasterKeyPrivate = {
  key: string // base64エンコードされた秘密鍵
  keyType: "masterPrivate"
  version: number
}
```

アルゴリズムはml_dsa65を使用します。

鍵の目的は、ユーザーの識別と、ユーザーが持つ鍵の正当性を確認することです。
