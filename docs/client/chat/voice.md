# 音声メッセージを送信する

### Endpoint: `GET /takos/v2/client/chat/audio`

#### Parameters

※ formDataです

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| audio     | string | file        | true     |         |
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
