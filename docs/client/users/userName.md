# userNameを取得するapi

### Endpoint: `GET /takos/v2/client/users/:id/userName`

#### Parameters

| Name | Type   | Description                              | Required | Default |
| ---- | ------ | ---------------------------------------- | -------- | ------- |
| [id] | string | userName                                 | true     |         |
| type | string | friend or room or friendkey or community | false    | friend  |

※[]はurl埋め込み

#### Response

```
{
    userName: string,
    status: true
}
```

#### Description

ユーザーネームを取得
