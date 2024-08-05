# コミュニティーをブロックする

### Endpoint: `POST /takos/v2/client/block/community`

### Parameters

| Name        | Type   | Description  | Required | Default |
| ----------- | ------ | ------------ | -------- | ------- |
| communityId | string | community id | true     |         |
| csrftoken   | string | csrftoken    | true     |         |

### Response

```
{
    status: true
}
```

### Description

コミュニティーをブロックします。
