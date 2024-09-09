# roomを削除するapi

### Endpoint: `POST /takos/v2/client/room/delete`

#### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| csrftoken | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

communityを削除します。
