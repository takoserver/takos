# messageを取得するapi

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/message`

### パラメーター

| 名前        | 型     | 説明         |
| ----------- | ------ | ------------ |
| `messageId` | string | 鍵のユーザー |
| `roomId`    | string | 鍵のハッシュ |

### レスポンス

レスポンスコード: 200

```ts
{
  message: string;
  signature: string;
  timestamp: string;
  userName: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
