# nickNameを取得するapi

### Endpoint: `GET /takos/v2/client/users/:id/nickName`

#### Parameters

| Name | Type   | Description                              | Required | Default |
| ---- | ------ | ---------------------------------------- | -------- | ------- |
| [id] | string | userName                                 | true     |         |
| type | string | friend or room or friendkey or community | false    | friend  |

※[]はurl埋め込み

#### Response

```
{
    nickName: string,
    status: true
}
```

#### Description

ニックネームを取得
