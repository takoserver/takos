# publicGroupのパーミッション取得

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/publicGroupPermission`

### パラメーター

| 名前     | 型     | 説明            |
| -------- | ------ | --------------- |
| `roomId` | string | publicGroupのid |

### レスポンス

レスポンスコード: 200

```ts
{
  deleteMessage: boolean;
  kickUser: boolean;
  acceptRequestJoin: boolean;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
