# identityKeyを取得する

type:`getIdentityKey`

### request value:

```ts
{
    userId: string;
    keyHash: string;
}
```

### レスポンス

```ts
{
    status: boolean;
    identityKey: string;
    signature: string;
}
```