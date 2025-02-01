# serverの情報を取得する

- **HTTPメソッド**: GET
- **URLパス**: `_takos/v2/publicGroup/search`

| 名前    | 型     | 説明            |
| ------- | ------ | --------------- |
| `query` | string | publicGroupのid |

### response

```ts
{
  groupId: string;
  groupName: string;
  groupDescription: string;
  groupIconImage: string;
}
[];
```
