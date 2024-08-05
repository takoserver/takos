# コミュニティーをブロックする

### Endpoint: `POST /takos/v2/client/block/room`

### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| csrftoken | string | csrftoken   | true     |         |

### Response

```
{
    status: true
}
```

### Description

roomをブロックします。
