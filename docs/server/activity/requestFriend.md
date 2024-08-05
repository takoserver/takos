# 友達リクエスト承認object

### request format

```typescript
{
  type: "requestFriend",
  objectid: string,
  data: {
    friendName: string,
    userId: string,
    status: boolean
  }
}
```

### response format

```typescript
{
  status: boolean,
  friendId: string
}
```

### description

承認を必要とするObjectの内容を承認します。statusがtrueの場合、Objectは承認されます。statusがfalseの場合、Objectは拒否されます。
object自体が保存され、承認されたときに実行されるわけではなく、objectidのObjectの内容を承認するためのAPIです。
