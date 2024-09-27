# webサイトアクセス時に前提情報を取得する

### Endpoint

```
GET /takos/v2/client/sessions/init
```

### Parameters

Nothing

### Response

```ts
{
    "userName": string,
    "setuped": boolean,
    "nickname": string,
    "logedIn": boolean,
}
```
