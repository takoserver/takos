# serverの情報を取得する

type: `getServerInfo`

### request value:

```ts
{}
```

### response

```ts
{
    status: boolean;
    message: string;
    serverInfo: {
        serverDomain: string;
        serverName: string;
        takosProtocolVersion: string;
    }
}
```