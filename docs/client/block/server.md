# コミュニティーをブロックする

### Endpoint: `POST /takos/v2/client/block/server`

### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| domain    | string | domain      | true     |         |
| csrftoken | string | csrftoken   | true     |         |

### Response

```
{
    status: true
}
```

### Description

サーバーをブロックします。
