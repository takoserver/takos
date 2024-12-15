# グループの情報を取得する

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/group/info`

### パラメーター

| 名前      | 型     | 説明         |
| --------- | ------ | ------------ |
| `groupId` | string | グループのid |

### レスポンス

レスポンスコード: 200

```ts
{
    groupId: string;
    groupName: string;
    userIds: string[];
    icon: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
