# メッセージ削除

### Endpoint: `POST /takos/v2/client/chat/delete`

#### Parameters

※ formDataです

| Name            | Type   | Description                | Required | Default |
| --------------- | ------ | -------------------------- | -------- | ------- |
| message         | string | 暗号化されたメッセージのid | true     |         |
| roomid          | string | ルームid                   | true     |         |
| messageServerId | string | メッセージのサーバーid     | true     |         |
| timestamp       | string | timestamp                  | true     |         |
| csrftoken       | string | csrftoken                  | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

コミュニティーを検索します。
