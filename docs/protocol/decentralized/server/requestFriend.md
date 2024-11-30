# 別サーバーにfriend申請するapi

type: `requestFriend`

### request value: 

```ts
{
    requestId: string;
    senderId: string;
    receiverId: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    message: string;
}
```