# ルーム作成するapi

### Endpoint: `POST /takos/v2/client/room/create`

#### Parameters

※Form Data

| Name      | Type     | Description        | Required | Default |
| --------- | -------- | ------------------ | -------- | ------- |
| name      | string   | name               | true     |         |
| icon      | string   | アイコン           | false    |         |
| csrftoken | string   | csrftoken          | true     |         |
| invite    | [string] | 招待するユーザー名 | false    |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

ルームを作成します。
