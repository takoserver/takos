# メッセージの暗号化の手順

## 1. 共通鍵の生成

メッセージの暗号化は以下の手順で行われます。
自らのroom_keyの秘密鍵と信頼しているユーザーのroom_keyの公開鍵を利用して共通鍵を生成し、メッセージを暗号化します。

1か月以上またはユーザーが規定した期間更新されていないroom_keyは信用されません。

## 2. 公開鍵の共有

メッセージの暗号化には、room_keyの公開鍵が必要です。
room_keyの公開鍵は、サーバーにアップロードされているため、サーバーから取得します。

### Endpoint `GET /takos/client/crypto/roomkey/`

| 名前     | 型     | 説明       | 必須 |
| -------- | ------ | ---------- | ---- |
| room_id  | string | ルームid    | true |
| csrftoken| string | CSRFトークン| true |


### リモートサーバーに鍵を要求

[getRoomKey](/protocol/activity/getRoomKey)を参照

account_keyで署名されているため、検証しする

## 3. メッセージの暗号化

メッセージのフォーマット

```ts
{
    messageType: "text",
    encrypted: boolean,
    serverMessageId: string,
    timestamp: string,
    message: string,　//room_keyによって暗号化
    allowedUsers: [{
        userNames: string[],
        roomKeyTimeStamp: string
    }]
}
```
messageの中身

```ts
{
    messageid: string,
    message: string,
    timestamp: string,
}
```

