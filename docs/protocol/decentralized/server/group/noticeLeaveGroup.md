# グループの脱退通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/noticeLeave`

### ヘッダー

| 名前            | 型     | 説明                                       |
| --------------- | ------ | ------------------------------------------ |
| `Authorization` | string | 認証情報を含むヘッダー（以下の形式で指定） |

**`Authorization`ヘッダーの形式**:

```
Authorization: Signature sign="<署名>", Expires="<有効期限>, domain="<ドメイン>"
```

- `sign`: リクエストボディの署名
- `Expiry`: 鍵の有効期限

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前      | 型     | 説明                                     |
| --------- | ------ | ---------------------------------------- |
| `groupId` | string | グループのID                             |
| `userId`  | string | 脱退したユーザーid                       |
| `type`    | string | リクエストの種類（`"noticeLeaveGroup"`） |
| `eventId` | string | イベントID(uuid v7)                      |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
