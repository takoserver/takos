# shareKeyの更新

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/shareKey`

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

| 名前        | 型     | 説明       |
| ----------- | ------ | ---------- |
| `shareKey`  | string | シェアキー |
| `signature` | string | 署名       |

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
