# メッセージを送信するapi

## friend

type: `sendFriendMessage`

### request value: 

```ts
{
    messageId: string;
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

## group

type: `sendGroupMessage`

### request value: 

```ts
{
    messageId: string;
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

## publicGroup

type: `sendPublicGroupMessage`

### request value: 

```ts
{
    messageId: string;
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