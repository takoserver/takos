# roomKey

roomKeyのデータ型

```typescript
//timestampはISO8601形式の文字列
interface RoomKey {
  key: string
  sign: Sign
  keyType: "roomKey"
  timestamp: string // 鍵の作成日時
  keyExpiration: string // 鍵の有効期限
  timeAndExpirationSign: Sign // 鍵の作成日時と有効期限に対する署名
  hashHex: string
  version: number
}
```

roomKeyは、各ユーザーのaccountKeyで暗号化した後、自らのidentityKeyで署名されます。

アルゴリズムはAES-256を使用します。

roomKeyによって暗号化されたデータの型

```typescript
interface EncryptedDataRoomKey {
  encryptedData: string
  keyType: "roomKey"
  iv: string
  encryptedKeyHashHex: string
  version: number
}
```