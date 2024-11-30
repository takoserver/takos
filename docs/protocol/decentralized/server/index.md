# サーバー間でのリクエストの処理

エンドポイント: `/takos/v2/server`

## リクエスト

※getServerKeyのリクエストは除く

```ts
{
    type: string,
    query: {
        signature: string, //署名
        request: string, //request to string
        keyTimestamp: string, //鍵のタイムスタンプ
        keyExpire: string,　//鍵の有効期限
        serverDomain: string, //リクエスト元のドメイン
    }
}
```

## リクエスト処理

1. リクエスト元のドメインから、`keyTimestamp`と`keyExpire`が該当する鍵を取得します。
2. 取得した鍵で`request`を検証します。
3. 検証が成功した場合、リクエストを処理します。

これから記述するリクエストはrequestにstringにしたものです。