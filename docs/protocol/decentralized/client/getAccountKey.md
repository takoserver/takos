# accountKeyを取得する

type:`getAccountKey`

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
    accountKey: string;
    signature: string;
}
```