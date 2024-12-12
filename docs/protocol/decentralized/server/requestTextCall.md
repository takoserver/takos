# text通話をリクエストするapi

type: `requestTextCall`

### request value: 

```ts
{
    targetUserId: string;
    requesterUserId: string;
    callId: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    message: string;
}
```