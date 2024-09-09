# WebSocket エンドポイント

### エンドポイント

`GET /takos/v2/client/ws`

これはWebSocket接続を確立するためのエンドポイントです。

### リクエストとレスポンス

#### 1. 友達のルームに参加する

**リクエスト**

```json
{
    "type": "joinFriendRoom",
    "friendName": string
}
```

**レスポンス**

```json
{
    "type": "joinFriendRoom",
    "status": string
}
```

#### 2. 特定のルームに参加する

**リクエスト**

```json
{
    "type": "joinRoom",
    "roomid": string
}
```

**レスポンス**

```json
{
    "type": "joinRoom",
    "status": string
}
```

### サーバーからのメッセージ

#### 接続が開かれたとき

```json
{
    "sessionid": string
}
```

#### 友達からのメッセージ

```json
{
  "type": "friendMessage",
  "message": "メッセージ内容",
  "userName": "ユーザー名",
  "messageid": "メッセージID",
  "time": "日時"
}
```

#### ルームからのメッセージ

```json
{
  "type": "roomMessage",
  "message": "メッセージ内容",
  "userName": "ユーザー名",
  "messageid": "メッセージID",
  "time": "日時"
}
```

#### メッセージが読まれたとき（友達）

```json
{
  "type": "friendRead",
  "friendid": "友達のID",
  "messageid": "メッセージID"
}
```

#### メッセージが読まれたとき（ルーム）

```json
{
  "type": "roomRead",
  "roomid": "ルームのID",
  "messageid": "メッセージID"
}
```

#### 通知

```json
{
  "type": "notification",
  "message": "通知内容",
  "link": "リンク"
}
```
