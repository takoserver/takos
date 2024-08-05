# Friendにメッセージを送信する

### request format

```typescript
{
  type: "sendFriendMessage",
  objectid: string,
  data: {
    message: string,
    friendId: string
  }
}
```

### response format

```typescript
{
  status: boolean;
}
```

### description
