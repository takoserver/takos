# serverKeyを取得するapi

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/serverKey`

### パラメーター

| 名前     | 型     | 説明         |
| -------- | ------ | ------------ |
| `expiry` | string | 鍵の有効期限 |

### レスポンス

レスポンスコード: 200

```ts
{
  serverKey: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
