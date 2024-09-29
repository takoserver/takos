# Identity Key

identityKeyのデータ型

```typescript
//timestampはISO8601形式の文字列
interface KeyShareKeyPub {
  key: string
  sign: Sign // 署名情報
  keyType: "keySharePub" // 鍵の種類
  timestamp: string // 鍵の作成日時
  keyExpiration: string // 鍵の有効期限
  timeAndExpirationSign: Sign //timestamp + keyExpirationを署名
  version: number // 鍵のバージョン
}

interface KeyShareKeyPrivate {
  key: string
  keyType: "keySharePrivate" // 鍵の種類
}

interface KeyShareKey {
  public: KeyShareKeyPub // 公開鍵情報
  private: KeyShareKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
  version: number // 鍵のバージョン
}
```

keyShareKeyによって暗号化されたデータの型

```typescript
interface EncryptedDataKeyShareKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "keyShareKey" // 使用された鍵の種類
  encryptedDataSign: Sign //暗号化されたデータに対する署名
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  signKeyHashHex: string //署名した鍵のハッシュ値
  version: number
  cipherText: string //共有秘密を生み出すための暗号文
}
```

masterKeyによって署名され、信用はmasterKeyによって確認されます。
主に様々なデータの署名に使用されます。

アルゴリズムはml_kem768を使用します。