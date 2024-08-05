# 画像メッセージを送信する

### Endpoint: `POST /takos/v2/client/chat/video`

#### Parameters

※ formDataです

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| video     | string | file        | true     |         |
| csrftoken | string | csrftoken   | true     |         |

#### Response

```
{
    status: true
}
```

#### Description

動画メッセージを送信します。
