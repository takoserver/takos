# roomKeyを取得する

type:`getRoomKey`

### request value:

```ts
{
    userId: string;
    requesterId: string;
    keyHash: string;
    roomId: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    roomKey: string;
    signature: string;
}
```