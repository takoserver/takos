# グループから追放するapi

type: `kickGroup`

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
}
```