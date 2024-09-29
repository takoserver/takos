# tailDataのルール

以下の秩序を守り会話を行う。
- roomKeyで暗号化してidentityKeyで署名する
- 一度使われたidentityKeyは連続してのみ使用できる。
- リプレイ攻撃対策にtimestampを付与する。
- timestampは同じユーザーで一意である必要がある。
- serverから伝えられたtimestampとメッセージに付属したtimestampが1分以上ずれている場合は拒否する。
- メッセージの表示順はサーバーのtimestampによって決定される。

暗号化されたメッセージの型

```typescript
type EncryptedMessage = {
  value: {
    data: EncryptedDataRoomKey
    timestamp: string
  }
  signature: Sign,
  channel: string
}
```

暗号化されたメッセージの復号化後の型

```typescript
interface Message {
  message: string
  type: "text" | "image" | "video" | "audio" | "file"
  version: number,
  channel: string
}
```