# roomKeyの更新api

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/roomKey`

### ヘッダー

| 名前            | 型     | 説明                                       |
| --------------- | ------ | ------------------------------------------ |
| `Authorization` | string | 認証情報を含むヘッダー（以下の形式で指定） |

**`Authorization`ヘッダーの形式**:

```
Authorization: sessionid <セッションID>
```

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前                  | 型                                    | 説明                     |
| --------------------- | ------------------------------------- | ------------------------ |
| `roomId`              | string                                | 部屋ID                   |
| `encryptedRoomKey`    | { userId: string, roomKey: string }[] | 暗号化された部屋鍵       |
| `roomKeyMetaData`     | string                                | 部屋鍵のメタデータ       |
| `roomKeyMetaDataSign` | string                                | 部屋鍵のメタデータの署名 |

### レスポンス

レスポンスコード: 200

```ts
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
