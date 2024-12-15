# serverの情報を取得する

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/serverInfo`

### response

```ts
{
  serverInfo: {
    serverDomain: string;
    serverName: string;
    takosProtocolVersion: string;
  }
}
```
