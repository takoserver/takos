# グループ名の変更

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/name`

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

| 名前      | 型     | 説明                                      |
| --------- | ------ | ----------------------------------------- |
| `groupId` | string | グループのid                              |
| `name`    | string | グループの名前                            |
| `type`    | string | アイコンの変更の種類（`changeGroupName`） |
| `eventId` | string | イベントID(uuid v7)                       |

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
