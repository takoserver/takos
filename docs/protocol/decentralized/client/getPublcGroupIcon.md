# publicGroupのアイコン取得

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/publicGroup/icon`

### パラメーター

| 名前     | 型     | 説明     |
| -------- | ------ | -------- |
| `groupId` | string | グループId |

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
