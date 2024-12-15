# friendの情報を取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/friend/info`

### パラメーター

| 名前     | 型     | 説明     |
| -------- | ------ | -------- |
| `userId` | string | ユーザー |

### レスポンス

レスポンスコード: 200

```ts
{
  icon: string;
  nickName: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
