# アカウント登録API

### 1. 仮登録

**エンドポイント**

```
POST /takos/v2/client/sessions/registers/temp
```

**パラメータ**

| 名前         | 型     | 説明                       | 必須 |
| ------------ | ------ | -------------------------- | ---- |
| email        | string | メールアドレス             | true |
| recaptcha    | string | reCAPTCHAトークン          | true |
| recapchakind | string | reCAPTCHAの種類 (v2 or v3) | true |

**レスポンス**

```
{
    "status": true,
    "sessionid": "string"
}
```

**説明**
メールアドレスを使用して仮登録を行います。成功すると`sessionid`が返されます。

### 2. メール認証

**エンドポイント**

```
POST /takos/v2/client/sessions/registers/auth
```

**パラメータ**

| 名前         | 型     | 説明                       | 必須 |
| ------------ | ------ | -------------------------- | ---- |
| code         | string | 認証コード                 | true |
| email        | string | メールアドレス             | true |
| recaptcha    | string | reCAPTCHAトークン          | true |
| recapchakind | string | reCAPTCHAの種類 (v2 or v3) | true |
| sessionid    | string | 仮登録のセッションID       | true |

**レスポンス**

```
{
    "status": true,
    "server_public_key": "string",
    "server_private_key": "string"
}
```

**説明** メールに送られた認証コードを使用してメールアドレスを認証します。

### 3. 登録完了

**エンドポイント**

```
POST /takos/v2/client/sessions/registers/auth
```

**パラメータ**

| 名前         | 型     | 説明                       | 必須 |
| ------------ | ------ | -------------------------- | ---- |
| userName     | string | ユーザーネーム             | true |
| password     | string | パスワード                 | true |
| email        | string | メールアドレス             | true |
| recaptcha    | string | reCAPTCHAトークン          | true |
| recapchakind | string | reCAPTCHAの種類 (v2 or v3) | true |
| sessionid    | string | 登録のセッションID         | true |

**レスポンス**

```
{
    "status": true
}
```

**説明** 必要な情報を入力して、ユーザー登録を完了します。

### 4. 初期設定

**エンドポイント**

```
POST /takos/v2/client/sessions/registers/setup
```

**パラメータ**

| 名前                 | 型     | 説明                 | 必須 |
| -------------------- | ------ | -------------------- | ---- |
| nickName             | string | ニックネーム         | true |
| icon                 | string | アイコン             | true |
| recaptcha            | string | reCAPTCHAトークン    | true |
| age                  | string | 年齢                 | true |
| account_sign_key     | string | 署名用アカウント鍵   | true |
| account_ encrypt_key | string | 暗号化用アカウント鍵 | true |
| device_key           | string | デバイス鍵           | true |
| csrftoken            | string | CSRFトークン         | true |

**レスポンス**

```
{
    "status": true
}
```

**説明** ユーザーの初期設定を完了します。
