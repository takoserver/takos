# 友達申請をする

### Endpoint: `POST /takos/v2/client/friends/request`

#### Parameters

※Form Data

| Name       | Type   | Description | Required | Default |
| ---------- | ------ | ----------- | -------- | ------- |
| friendName | string | friendId    | false*1  |         |
| friendKey  | string | friendKey   | false*1  |         |
| csrftoken  | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

友達申請をします。
