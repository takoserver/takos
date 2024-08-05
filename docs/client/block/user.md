# コミュニティーをブロックする

### Endpoint: `POST /takos/v2/client/block/user`

### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| userId    | string | userId      | true     |         |
| csrftoken | string | csrftoken   | true     |         |

### Response

```
{
    status: true
}
```

### Description

ユーザーをブロックします。
