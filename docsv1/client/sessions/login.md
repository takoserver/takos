### Endpoint

```
POST /takos/v2/client/sessions/login
```

### Parameters

| name      | type   | description      | required |
| --------- | ------ | ---------------- | -------- |
| userName  | string | ユーザーネーム   | false *1 |
| password  | string | パスワード       | true     |
| email     | string | email            | false *1 |
| deviceKey | string | デバイス鍵(秘密) | true     |

*1はいずれか一つは必須

### Response

```
headers: {
    "Content-Type": "application/json",
    "Set-Cookie": `sessionid=${sessionid}; Path=/; Max-Age=2592000;`,
},

body: {
    status: true
}
```

## descripton

ログインしていない場合、sessionidを発行します
