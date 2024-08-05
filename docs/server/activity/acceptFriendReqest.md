# フレンドリクエストの承認

### request format

```typescript
{
  type: "acceptFriendReqest",
  objectid: string,
  data: {
    friendid: string,
    status: boolean
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

friendRequestを承認するObjectです。statusがtrueの場合、Objectは承認されます。statusがfalseの場合、Objectは拒否されます。
