# friendのnickNameを取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/friend/nickName`

### パラメーター

| 名前     | 型     | 説明     |
| -------- | ------ | -------- |
| `userId` | string | ユーザー |

### レスポンス

レスポンスコード: 200

```ts
{
  nickName: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
