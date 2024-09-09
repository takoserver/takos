# talkDataを取得する

### Endpoint: `GET /takos/v2/client/chat/:id/talkData`

#### Parameters

| Name    | Type   | Description                          | Required | Default |
| ------- | ------ | ------------------------------------ | -------- | ------- |
| [id]    | string | roomId                               | true     |         |
| around? | string | そのメッセージ周辺のメッセージを取得 | false    |         |
| before? | string | そのメッセージの前のメッセージを取得 | false    |         |
| after?  | string | そのメッセージの後のメッセージを取得 | false    |         |
| limit?  | string | 取得するメッセージ数(制限1-100)      | false    | 15      |

#### Response

※textのみ取得 その他の形式は他のapiによって取得する

```
{
    status: true,
    talkData: [
        {
            type: string,
            messageType: string,
            userName?: string,
            nickName?: string,
            roomName?: string,
            messageid: string,
            text?: string,
            time: string,
        }
    ]
}
```

#### Description

トークデータを取得します。
