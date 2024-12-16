# groupのdescriptionを取得するapi

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/group/description`

### パラメーター

| 名前      | 型     | 説明       |
| --------- | ------ | ---------- |
| `groupId` | string | グループId |

### レスポンス

レスポンスコード: 200

```ts
{
  description: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
