# deviceKey

deviceKeyは、サーバーに保存され、クライアントを紛失した場合に鍵を盗まれることを防ぐために使用されます。

```typescript
//timestampはISO8601形式の文字列

type deviceKeyPub = {
  key: string
  sign: Sign
  keyType: "devicePub"
  version: number
}

type deviceKeyPrivate = {
  key: string
  sign: Sign
  keyType: "devicePrivate"
  version: number
}

type deviceKey = {
  public: deviceKeyPub
  private: deviceKeyPrivate
  hashHex: string
  version: number
}
```

アルゴリズムはml_kem768を使用します。

鍵の目的は、ユーザーの識別と、ユーザーが持つ鍵の正当性を確認することです。

暗号化されたデータの型

```typescript
interface EncryptedDataDeviceKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "DeviceKey" // 使用された鍵の種類
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  version: number
  cipherText: string //共有秘密を生み出すための暗号文
}
```