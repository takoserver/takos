# roomに招待するapi

### Endpoint: `POST /takos/v2/client/room/invite`

#### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| userName  | string | userName    | true     |         |
| csrftoken | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

privatecommunityにユーザーを招待します。
