# メッセージ削除

### Endpoint: `POST /takos/v2/client/chat/delete`

#### Parameters

※ formDataです

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| messageid | string | messageid   | true     |         |
| csrftoken | string | csrftoken   | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

コミュニティーを検索します。
