# publicGroupのアイコン取得

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/publicGroup/name`

### パラメーター

| 名前     | 型     | 説明     |
| -------- | ------ | -------- |
| `groupId` | string | グループId |

### レスポンス

レスポンスコード: 200

```ts
{
    name: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
