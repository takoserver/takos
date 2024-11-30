# グループ招待するapi

type: `inviteGroup`

### request value: 

```ts
{
    requestId: string;
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
}
```