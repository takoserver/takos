# パブリックグループへの参加リクエストの承認

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/acceptRequestJoin`

### ヘッダー

| 名前            | 型     | 説明                                       |
| --------------- | ------ | ------------------------------------------ |
| `Authorization` | string | 認証情報を含むヘッダー（以下の形式で指定） |

**`Authorization`ヘッダーの形式**:

```
Authorization: Signature sign="<署名>", Expires="<有効期限>, domain="<ドメイン>"
```

- `sign`: リクエストボディ全体を署名したもの。
- `Expires`: ISO 8601 フォーマット（例: `2024-12-15T10:00:00Z`）。
- `domain`: 対象リクエストのドメイン名（例: `example.com`）。

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前      | 型     | 説明                                                 |
| --------- | ------ | ---------------------------------------------------- |
| `groupId` | string | グループのid                                         |
| `userId`  | string | ユーザーのid                                         |
| `type`    | string | リクエストの種類（`"acceptRequestJoinPublicGroup"`） |

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
