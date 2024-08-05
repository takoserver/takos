# メッセージの検索

### Endpoint: `GET /takos/v2/client/chat/search`

#### Parameters

| Name   | Type   | Description | Required | Default |
| ------ | ------ | ----------- | -------- | ------- |
| roomId | string | roomId      | true     |         |
| query  | string | query       | true     |         |
| limit  | number | limit       | false    | 10      |

#### Response

```
{
    status: true,
    messages: [
        {
            messageId: string,
            roomId: string,
            userId: string,
            message?: string,
            messageId: string,
            type: string,
            createdAt: string
        }
    ]
}
```

#### Description

メッセージを検索します。
