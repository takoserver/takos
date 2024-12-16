# セッション管理APIs

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/tempAuth`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前              | 型     | 説明                  |
| ----------------- | ------ | --------------------- |
| `email`           | string | メールアドレス        |
| `recaptchaToken`  | string | reCAPTCHAのトークン   |
| `recapchaVersion` | string | reCAPTCHAのバージョン |

### レスポンス

レスポンスコード: 200

```ts
{
  tempAuthCode: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/checkEmail`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `tempAuthCode` | string | 一時認証コード             |
| `checkCode`    | string | メールに送られた認証コード |

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

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/auth`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前           | 型     | 説明           |
| -------------- | ------ | -------------- |
| `tempAuthCode` | string | 一時認証コード |
| `userId`       | string | ユーザID       |
| `password`     | string | パスワード     |

### レスポンス

レスポンスコード: 200

```ts
{
  sessionid: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/setup`

※setUp済みでもMasterKeyを紛失した場合、このAPIを使用してMasterKeyを再設定できます。

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前              | 型     | 説明                 |
| ----------------- | ------ | -------------------- |
| `nickName`        | string | ニックネーム         |
| `icon`            | string | アイコン             |
| `birthday`        | string | 誕生日               |
| `masterKey`       | string | マスターキー         |
| `identityKey`     | string | 識別キー             |
| `identityKeySign` | string | 識別キーサイン       |
| `accountKey`      | string | アカウントキー       |
| `accountKeySign`  | string | アカウントキーサイン |
| `sharedKey`       | string | 共有キー             |

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

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/encrypt`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前              | 型     | 説明                 |
| ----------------- | ------ | -------------------- |
| `identityKey`     | string | 識別キー             |
| `identityKeySign` | string | 識別キーサイン       |
| `accountKey`      | string | アカウントキー       |
| `accountKeySign`  | string | アカウントキーサイン |
| `sharedKey`       | string | 共有キー             |

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

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/login`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前          | 型     | 説明           |
| ------------- | ------ | -------------- |
| `userId`      | string | ユーザID       |
| `password`    | string | パスワード     |
| `sessionUUID` | string | セッションUUID |

### レスポンス

レスポンスコード: 200

```ts
{
  sessionid: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/requestMigrate`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前           | 型     | 説明                 |
| -------------- | ------ | -------------------- |
| `migrationKey` | string | マイグレーションキー |

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

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/acceptMigrate`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前             | 型     | 説明                     |
| ---------------- | ------ | ------------------------ |
| `migrateSignKey` | string | マイグレーション署名キー |

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

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/api/sessions/sendMigrateData`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前          | 型     | 説明                   |
| ------------- | ------ | ---------------------- |
| `migrateData` | string | マイグレーションデータ |
| `migrateSign` | string | マイグレーション署名   |

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

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `/api/sessions`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前 | 型 | 説明 |
| ---- | -- | ---- |
|      |    |      |

### レスポンス

レスポンスコード: 200

```ts
sessionUUID: string[];
```

レスポンスコード: 400

```ts
{
  error: string;
}
```
