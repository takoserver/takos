# publicGroupのDescriptionを変更する

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/publicGroup/description`

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

| 名前          | 型     | 説明     |
| ------------- | ------ | -------- |
| `description` | string | nickName |

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