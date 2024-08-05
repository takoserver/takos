# listを取得する

### Endpoint: `GET /takos/v2/client/chat/list`

#### Parameters

Nothing

#### Response

```
{
    status: true,
    list: [
        {
            type: string,
            userName?: string,
            nickName?: string,
            roomName?: string,
            lastMessage: string,
            lastMessageTime: string,
        }
    ]
}
```

#### Description

コミュニティーを検索します。
