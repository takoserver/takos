# groupのiconを取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/group/icon`

### パラメーター

| 名前      | 型     | 説明     |
| --------- | ------ | -------- |
| `GroupId` | string | ユーザー |

### レスポンス

レスポンスコード: 200

```ts
{
  icon: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
