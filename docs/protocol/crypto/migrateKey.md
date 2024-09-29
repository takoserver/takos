# masterKey

masterKeyのデータ型

```typescript
//timestampはISO8601形式の文字列

interface migrateKeyPub {
  key: string
  keyType: "migratePub"
  version: number
}

interface migrateKeyPrivate {
  key: string
  keyType: "migratePrivate"
  version: number
}

interface migrateKey {
  public: migrateKeyPub
  private: migrateKeyPrivate
  hashHex: string
  version: number
}
```

暗号化されたデータの型

```typescript
JSON.stringify([arrayBufferToBase64(encryptedData), arrayBufferToBase64(cipherText)])
```

アルゴリズムはml_kem768を使用します。

鍵の目的は、ユーザーの識別と、ユーザーが持つ鍵の正当性を確認することです。