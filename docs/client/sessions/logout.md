### Endpoint

```
POST /takos/v2/client/sessions/logout
```

### Parameters

| name      | type   | description  | required |
| --------- | ------ | ------------ | -------- |
| csrftoken | string | csrfトークン | true     |

### Response

```
headers: {
    "Content-Type": "application/json",
    "Set-Cookie": `sessionid=""; Path=/;`,
},

body: {
    status: true
}
```

## descripton

ログインしていない場合、sessionidを発行します
