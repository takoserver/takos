# groupNameを取得するapi

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/group/name`

### パラメーター

| 名前      | 型     | 説明     |
| --------- | ------ | -------- |
| `GroupId` | string | ユーザー |

### レスポンス

レスポンスコード: 200

```ts
{
  groupName: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
