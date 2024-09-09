# テキストメッセージ送信

### Endpoint: `POST /takos/v2/client/chat/text`

#### Parameters

| Name       | Type   | Description  | Required | Default |
| ---------- | ------ | ------------ | -------- | ------- |
| roomId     | string | roomId       | false*   |         |
| friendName | string | friendName   | false*   |         |
| text       | string | text         | true     |         |
| sessionid  | string | ws sessionid | true     |         |

#### Response

```
{
    status: true
}
```

#### Description

テキストメッセージを送信します。
