# communityを作成するapi

### Endpoint: `POST /takos/v2/client/community/create`

#### Parameters

※Form Data

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| name      | string | name        | true     |         |
| icon      | string | アイコン    | false    |         |
| csrftoken | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

コミュニティを作成します。
