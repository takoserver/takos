# textCall用websocket api

endpoint: `/takos/v2/client/textCall?callId=${callId}`

onMessageの形式は次のjsonをstringifyしたものです。

```ts
{
    type: string,
    query: {
        // ...
    }
}
```

## type: `sendMessage`

### request value: 

```ts
{
    message: string;
    signature: string;
}
```

### 切断

切断すると同時に通話を終了します。