# puublicGroupに参加するapi

type: "joinPublicGroup"

参加に申請が不要なpublicGroupに参加することができる。

## Request

```json
{
  "type": "joinPublicGroup",
  "publicGroupId": "string"
}
```

# Response

```json
{
  "publicGroupId": "string",
  "result": "success"
}
```