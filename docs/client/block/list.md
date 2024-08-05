# コミュニティーをブロックする

### Endpoint: `GET /takos/v2/client/block/list`

### Parameters

Nothing

### Response

```
{
    status: true,
    blockList: [
        {
            type: string,
            userName?: string,
            communityName?: string,
            groupName?: string,
        }
    ]
}
```

### Description

コミュニティーをブロックします。
