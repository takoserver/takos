# roomKeyを取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/roomKeyMetaData`

### パラメーター

| 名前     | 型     | 説明         |
| -------- | ------ | ------------ |
| `userId` | string | 鍵のユーザー |
| `hash`   | string | 鍵のハッシュ |
| `roomId` | string | 部屋のID     |

### レスポンス

レスポンスコード: 200

```ts
{
  metaData: string;
  signature: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
