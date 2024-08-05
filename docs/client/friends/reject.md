# 友達申請を拒否する

### Endpoint: `POST /takos/v2/client/friends/reject`

#### Parameters

※Form Data

| Name       | Type   | Description | Required | Default |
| ---------- | ------ | ----------- | -------- | ------- |
| friendName | string | friendId    | true     |         |
| csrftoken  | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

友達申請を拒否する
