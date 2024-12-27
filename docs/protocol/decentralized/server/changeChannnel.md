# channelの設定

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/channel`

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

| 名前      | 型     | 説明                                                             |
| --------- | ------ | ---------------------------------------------------------------- |
| `groupId` | string | グループのID                                                     |
| `channel` | string | チャンネルid                                                     |
| `change`  | string | 変更の種類（`add`, `remove` または　`edit`）                     |
| `name`    | string | チャンネル名                                                     |
| `role`    | string | 会話できる権限                                                   |
| `eventId` | string | イベントID（UUID v7）                                            |
| `type`    | string | リモートサーバーの変更の種類（`changeRemoteServersPublicGroup`） |

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
