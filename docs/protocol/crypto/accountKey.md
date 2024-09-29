# Identity Key

identityKeyのデータ型

```typescript
//timestampはISO8601形式の文字列
type AccountKeyPub = {
  key: string // 公開鍵
  sign: Sign // 署名情報
  keyType: "accountPub" // 鍵の種類
  version: number // 鍵のバージョン
}

// Account Keyの秘密鍵情報を格納する型
type AccountKeyPrivate = {
  key: string // 秘密鍵
  keyType: "accountPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}

// Account Keyのペア情報を格納する型
type AccountKey = {
  public: AccountKeyPub // 公開鍵情報
  private: AccountKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
  version: number // 鍵のバージョン
}
```

identityKeyによって署名され、信用はidentityKeyによって確認されます。

accountKeyによって暗号化されたデータの型

```typescript
interface EncryptedDataAccountKey {
  encryptedData: string　//base64エンコードされた暗号
  keyType: "accountKey" // 使用された鍵の種類
  cipherText: string //共有秘密を生み出すための暗号文をbase64エンコードしたもの
  encryptedKeyHashHex: string   //暗号化した鍵のハッシュ値
  version: number
}
```

共有秘密をAESの鍵として利用し暗号します。
ソースコード
```typescript
export async function encryptWithAccountKey(
  accountKey: AccountKeyPub,
  data: string,
): Promise<EncryptedDataAccountKey> {
  const key = new Uint8Array(base64ToArrayBuffer(accountKey.key))
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(key)
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"],
  )
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    sharedKey,
    encodedData,
  )
  return {
    encryptedData: arrayBufferToBase64(encryptedData),
    keyType: "accountKey",
    encryptedKeyHashHex: accountKey.sign.hashedPublicKeyHex,
    cipherText: arrayBufferToBase64(cipherText),
    version: 1,
  }
}
```

主にroomKeyの暗号化に使用されます。

アルゴリズムはml_kem768を使用します。