# accountKeyを取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/accountKey`

### パラメーター

| 名前     | 型     | 説明         |
| -------- | ------ | ------------ |
| `userId` | string | 鍵のユーザー |
| `hash`   | string | 鍵のハッシュ |

### レスポンス

レスポンスコード: 200

```ts
{
  accountKey: string;
  signature: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
