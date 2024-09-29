# migrateDataSignKey

migrateDataSignKeyのデータ型

```typescript
//timestampはISO8601形式の文字列

interface migrateDataSignKeyPub {
  key: string
  keyType: "migrateDataSignPub"
  version: number
}

interface migrateDataSignKeyPrivate {
  key: string
  keyType: "migrateDataSignPrivate"
  version: number
}

interface migrateDataSignKey {
  public: migrateDataSignKeyPub
  private: migrateDataSignKeyPrivate
  hashHex: string
  version: number
}
```

アルゴリズムはml_dsa65を使用します。

鍵の目的は、ユーザーの識別と、ユーザーが持つ鍵の正当性を確認することです。