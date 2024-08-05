# 友達申請を承認する

### Endpoint: `POST /takos/v2/client/friends/accept`

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

コミュニティを作成します。
