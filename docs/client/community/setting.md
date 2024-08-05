# コミュニティーの設定 API

### Endpoint: `GET /takos/v2/client/room/settings`

#### Parameters

| Name      | Type   | Description | Required | Default |
| --------- | ------ | ----------- | -------- | ------- |
| roomId    | string | roomId      | true     |         |
| csrftoken | string | csrftoken   | true     |         |
| setting   | object | 設定内容    | true     |         |

※[]はurl埋め込み

#### Response

```
{
    status: true
}
```

#### Description

コミュニティーを検索します。
