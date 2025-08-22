# DM仕様

takos のチャット機能はシンプルなダイレクトメッセージ(DM)のみを提供します。

## ActivityPubでの表現

DMは ActivityPub の `Create` アクティビティを利用し、`object` に `Note`
を用います。`to`
に送信先となるアクターを1つだけ含めた場合、サーバーはその投稿をDMとして保存し、指定した相手にのみ配送します。

```json
{
  "type": "Create",
  "to": ["https://example.com/users/bob"],
  "object": {
    "type": "Note",
    "content": "こんにちは"
  }
}
```

## REST API

DM メッセージの一覧取得と送信には次のエンドポイントを使用します。

- `GET /api/dm/messages?userA=alice&userB=bob`\
  2ユーザー間のメッセージを新しい順に返します。
- `POST /api/dm/messages`\
  本文の例: `{ "from": "alice", "to": "bob", "content": "hi" }`

## WebSocket通知

新しいDMが届くと、サーバーはログイン中の受信者へ `hasUpdate`
イベントを送信します。クライアントはこの通知を受け取ったら
`GET /api/dm/messages` を呼び出して最新メッセージを取得してください。
