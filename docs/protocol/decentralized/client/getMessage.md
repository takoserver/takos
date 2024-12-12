# messageを取得するapi

type: `getMessage`

### request value: 

```ts
{
    messageId: string;
    roomId: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    message: string;
    signature: string;
}
```