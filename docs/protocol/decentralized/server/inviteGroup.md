# グループ招待するapi

type: `inviteGroup`

### request value: 

```ts
{
    senderId: string;
    receiverId: string;
    groupId: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    message: string;
    requestId: string;
}
```