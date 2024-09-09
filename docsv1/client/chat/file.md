# ファイルメッセージを送信

### Endpoint: `POST /takos/v2/client/chat/file`

#### Parameters

※ formDataです

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| file      | string | file        | true     |         |
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
