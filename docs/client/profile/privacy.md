# プライバシー情報を変更する

### Endpoint: `POST /takos/v2/client/users/profile/privacy`

#### Parameters

| name      | type   | description                | required |
| --------- | ------ | -------------------------- | -------- |
| settings  | object | 変更する情報を入れたobject | false    |
| csrftoken | string | csrfトークン               | true     |

#### Response

```
{
    status: true
}
```

#### Description

プライバシー情報を変更する

# プライバシー情報を取得するapi

### Endpoint: `GET /takos/v2/client/users/profile/nickName`

#### Parameters

Nothing

#### Response

```
{
    status: true,
    settings: object
}
```

#### Description

プライバシー情報を取得する
