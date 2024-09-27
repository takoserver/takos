# iconを取得するapi

### Endpoint: `GET /takos/v2/client/users/:id/icon`

#### Parameters

| Name | Type   | Description                              | Required | Default |
| ---- | ------ | ---------------------------------------- | -------- | ------- |
| [id] | string | userName                                 | true     |         |
| type | string | friend or room or friendkey or community | false    | friend  |

※[]はurl埋め込み

#### Response

- Content-Type: `image/jpeg`
- Response Body: ユーザーのアイコン画像

#### Description

ユーザーのアイコン画像を取得します。
