# プロフィール取得API仕様

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `/api/profile`

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

| 名前 | 型 | 説明 |
| ---- | -- | ---- |
|      |    |      |

### レスポンス

レスポンスコード: 200

```ts
{
  nickName: string;
  description: string;
  icon: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
