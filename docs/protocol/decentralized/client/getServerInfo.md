# serverの情報を取得する

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/serverInfo`

### response

```ts
{
    serverName: string;
    serverDescription: string;
    serverIconImage: string;
    serverBackgroundImage: string;
    users: number;
    takosProtocolVersion: string;
}
```
