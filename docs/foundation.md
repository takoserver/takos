# Foundation api

takosサーバーではfoundation apiを試用して相互に通信します。
takosサーバーはこれらのapiを試用して、メッセージをリアルタイムで共有します。

API は、各サーバー間の HTTPS リクエストを使用して実装されます。これらの HTTPS
リクエストは、TLS トランスポート層での公開キー署名と、HTTP 層での HTTP
認証ヘッダー内の公開キー署名を使用して強力に認証されます。

## サーバー実装

### `GET` /_takos/v1/version

サーバーの実装名とバージョンを取得します。

レート制限: なし 認証: なし

### リクエスト

リクエストパラメータまたはリクエスト本文がありません。

### レスポンス

| 状態 | 説明           |
| ---- | -------------- |
| 200  | 実装バージョン |

#### 200

```json
{
  "version": "1.0.0",
  "name": "takos"
}
```

### `GET` /_takos/v1/key/server

サーバーの公開鍵を取得します。

サーバーの公開された署名キーを取得します。

レート制限: なし 認証: なし

#### リクエスト

`query`

| パラメータ | 説明           |
| ---------- | -------------- |
| `expire`   | キーの有効期限 |

#### レスポンス

| 状態 | 説明             |
| ---- | ---------------- |
| 200  | サーバーの公開鍵 |

#### 200

```json
{
  "key": "PUBLIC_KEY"
}
```

### `GET` /_takos/v1/key/server/{`serverName`}

他のサーバーの公開鍵を取得します。

レート制限: なし 認証: なし

#### リクエスト

`query`

| パラメータ   | 説明               |
| ------------ | ------------------ |
| `expires`    | キーの有効期限     |
| `serverName` | サーバー名(domain) |

#### レスポンス

| 状態 | 説明             |
| ---- | ---------------- |
| 200  | サーバーの公開鍵 |

#### 200

```json
{
  "key": "PUBLIC_KEY"
}
```

## 認証

サーバーによって行われるすべてのHTTPリクエストは、公開鍵署名を使用して認証されます。bodyの署名は、`Authorization`ヘッダーに含まれ、`X-Takos-Signature`ヘッダーに含まれます。

### `Authorization` ヘッダー

`Authorization` ヘッダーは、公開鍵署名を含むベアラートークンです。

```Authorization
Authorization: X-Takos-Signature sign="<署名>", Expires="<有効期限>, origin="<ドメイン>"
```

example:

```json
{
  "method": "POST",
  "path": "path(example)",
  "body": "body(example)",
  "Content-Type": "application/json",
  "Authorization": "X-Takos-Signature sign=\"<署名>\", Expires=\"<有効期限>\", origin=\"<ドメイン>\""
}
```

Authorization ヘッダーの形式は、 RFC 9110 のセクション 11.4で規定されています。

origin: 送信サーバーのサーバー名 expires: 有効期限 sign: 署名

### レスポンス認証

応答は TLS サーバー証明書によって認証されます。

### `POST` /_takos/v1/event/

イベントを送信します。

レート制限: あり 認証: あり

#### リクエスト

`body`

| パラメータ | 型       | 説明           |
| ---------- | -------- | -------------- |
| `event`    | `string` | イベント名     |
| `eventId`  | `string` | イベントID     |
| `payload`  | `object` | イベントデータ |

`payload` は、イベントデータを含むオブジェクトです。

#### レスポンス

レスポンスの内容はありません。 成功かどうかは、HTTP
ステータスコードで判断します。

## Events

### t.friend.request.send

友達リクエストを送信します。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `friendId` | `string` | 友達ID     |

### t.friend.request.cancel

友達リクエストをキャンセルします。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `friendId` | `string` | 友達ID     |

### t.friend.request.accept

友達リクエストを受け入れます。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `friendId` | `string` | 友達ID     |

### t.friend.remove

友達を削除します。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `friendId` | `string` | 友達ID     |

### t.message.send

メッセージを送信します。

`payload`

| パラメータ  | 型                               | 説明         |
| ----------- | -------------------------------- | ------------ |
| `userId`    | `string`                         | ユーザーID   |
| `messageId` | `string`                         | メッセージID |
| `roomId`    | `string`                         | ルームID     |
| `roomType`  | `friend or group or publicGroup` | ルームタイプ |
| `channelId` | `string`                         | チャンネルID |

### t.group.invite.send

グループに招待します。 privateのみ

`payload`

| パラメータ     | 型       | 説明           |
| -------------- | -------- | -------------- |
| `userId`       | `string` | ユーザーID     |
| `groupId`      | `string` | グループID     |
| `inviteUserId` | `string` | 招待ユーザーID |

### t.group.invite.accept

グループ招待を受け入れます。 privateのみ

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `groupId`  | `string` | グループID |

### t.group.invite.cancel

グループ招待を削除します。 privateのみ

`payload`

| パラメータ     | 型       | 説明           |
| -------------- | -------- | -------------- |
| `groupId`      | `string` | グループID     |
| `userId`       | `string` | ユーザーID     |
| `inviteUserId` | `string` | 招待ユーザーID |

### t.friend.group.invite

友達にグループに招待されたことを通知します。 privateのみ

`payload`

| パラメータ     | 型       | 説明           |
| -------------- | -------- | -------------- |
| `userId`       | `string` | ユーザーID     |
| `groupId`      | `string` | グループID     |
| `inviteUserId` | `string` | 招待ユーザーID |

### t.group.leave

グループを退出します。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `groupId`  | `string` | グループID |

### t.group.channel.add

グループチャンネルを作成/上書きします。

`payload`

| パラメータ    | 型                   | 説明         |
| ------------- | -------------------- | ------------ |
| `userId`      | `string`             | ユーザーID   |
| `groupId`     | `string`             | グループID   |
| `channelId`   | `string`             | チャンネルID |
| `channelName` | `string`             | チャンネル名 |
| `categoryId`  | `string or undefind` | カテゴリー   |
| `permission`  | `object[]`           | 権限         |

`object`

| パラメータ    | 型         | 説明       |
| ------------- | ---------- | ---------- |
| `userId`      | `string`   | ユーザーID |
| `permissions` | `string[]` | 権限       |

### t.group.channel.remove

グループチャンネルを削除します。

`payload`

| パラメータ  | 型       | 説明         |
| ----------- | -------- | ------------ |
| `userId`    | `string` | ユーザーID   |
| `groupId`   | `string` | グループID   |
| `channelId` | `string` | チャンネルID |

### t.group.category.add

グループカテゴリーを作成/上書きします。

`payload`

| パラメータ     | 型         | 説明         |
| -------------- | ---------- | ------------ |
| `userId`       | `string`   | ユーザーID   |
| `groupId`      | `string`   | グループID   |
| `categoryId`   | `string`   | カテゴリーID |
| `categoryName` | `string`   | カテゴリー名 |
| `permissions`  | `object[]` | 権限         |

`object`

| パラメータ   | 型         | 説明       |
| ------------ | ---------- | ---------- |
| `userId`     | `string`   | ユーザーID |
| `permission` | `string[]` | 権限       |

### t.group.category.remove

グループカテゴリーを削除します。

`payload`

| パラメータ   | 型       | 説明         |
| ------------ | -------- | ------------ |
| `userId`     | `string` | ユーザーID   |
| `groupId`    | `string` | グループID   |
| `categoryId` | `string` | カテゴリーID |

### t.group.role.create

グループロールを作成/上書きします。

`payload`

| パラメータ   | 型         | 説明         |
| ------------ | ---------- | ------------ |
| `userId`     | `string`   | ユーザーID   |
| `groupId`    | `string`   | グループID   |
| `roleId`     | `string`   | ロールID     |
| `roleName`   | `string`   | ロール名     |
| `permission` | `string[]` | 権限         |
| `color`      | `string`   | カラーコード |

### t.group.role.remove

グループロールを削除します。

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `groupId`  | `string` | グループID |
| `roleId`   | `string` | ロールID   |

### t.group.user.role

グループロールを割り当てます。 (上書き)

`payload`

| パラメータ     | 型         | 説明               |
| -------------- | ---------- | ------------------ |
| `userId`       | `string`   | ユーザーID         |
| `groupId`      | `string`   | グループID         |
| `roleId`       | `string[]` | ロールID           |
| `assignUserId` | `string`   | 割り当てユーザーID |

### t.group.user.join.request

グループに参加リクエストを送信します。 publicGroupのみ

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `groupId`  | `string` | グループID |

### t.group.user.join.accept

グループ参加リクエストを受け入れます。 publicGroupのみ

`payload`

| パラメータ      | 型       | 説明                 |
| --------------- | -------- | -------------------- |
| `userId`        | `string` | ユーザーID           |
| `groupId`       | `string` | グループID           |
| `requestUserId` | `string` | リクエストユーザーID |

### t.group.user.join.remove

グループ参加リクエストを削除します。 publicGroupのみ

`payload`

| パラメータ      | 型       | 説明                 |
| --------------- | -------- | -------------------- |
| `userId`        | `string` | ユーザーID           |
| `groupId`       | `string` | グループID           |
| `requestUserId` | `string` | リクエストユーザーID |

### t.group.user.join.cancel

グループ参加リクエストをキャンセルします。 publicGroupのみ

`payload`

| パラメータ | 型       | 説明       |
| ---------- | -------- | ---------- |
| `userId`   | `string` | ユーザーID |
| `groupId`  | `string` | グループID |

### t.group.user.kick

グループからユーザーをキックします。

`payload`

| パラメータ   | 型       | 説明             |
| ------------ | -------- | ---------------- |
| `userId`     | `string` | ユーザーID       |
| `groupId`    | `string` | グループID       |
| `kickUserId` | `string` | キックユーザーID |

### t.group.user.ban

グループからユーザーをBANします。

`payload`

| パラメータ  | 型       | 説明          |
| ----------- | -------- | ------------- |
| `userId`    | `string` | ユーザーID    |
| `groupId`   | `string` | グループID    |
| `banUserId` | `string` | BANユーザーID |

### t.group.user.unban

グループからユーザーのBANを解除します。

`payload`

| パラメータ  | 型       | 説明          |
| ----------- | -------- | ------------- |
| `userId`    | `string` | ユーザーID    |
| `groupId`   | `string` | グループID    |
| `banUserId` | `string` | BANユーザーID |

### t.group.defaultChannel

グループのデフォルトチャンネルを変更します。

`payload`

| パラメータ  | 型       | 説明         |
| ----------- | -------- | ------------ |
| `userId`    | `string` | ユーザーID   |
| `groupId`   | `string` | グループID   |
| `channelId` | `string` | チャンネルID |

### t.group.sync.user.add

ユーザーの追加情報を共有するイベント。

`payload`

| パラメータ      | 型       | 説明           |
| --------------- | -------- | -------------- |
| `groupId`       | string   | グループID     |
| `userId`        | string   | ユーザーID     |
| `role`          | string[] | ロールID       |
| `beforeEventId` | string   | 前のイベントID |

### t.group.sync.user.remove

ユーザーの削除情報を共有するイベント。

`payload`

| パラメータ      | 型     | 説明           |
| --------------- | ------ | -------------- |
| `groupId`       | string | グループID     |
| `userId`        | string | ユーザーID     |
| `beforeEventId` | string | 前のイベントID |

### t.group.sync.role.assign

ロールの割り当て情報を共有するイベント。

`payload`

| パラメータ      | 型     | 説明               |
| --------------- | ------ | ------------------ |
| `groupId`       | string | グループID         |
| `roleId`        | string | ロールID           |
| `userId`        | string | 割り当てユーザーID |
| `beforeEventId` | string | 前のイベントID     |

### t.group.sync.role.unassign

ロールの割り当て解除情報を共有するイベント。

`payload`

| パラメータ      | 型     | 説明               |
| --------------- | ------ | ------------------ |
| `groupId`       | string | グループID         |
| `roleId`        | string | ロールID           |
| `userId`        | string | 割り当てユーザーID |
| `beforeEventId` | string | 前のイベントID     |

### t.group.sync.channel.add

チャンネルの追加情報を共有するイベント。

`payload`

| パラメータ      | 型                                         | 説明           |
| --------------- | ------------------------------------------ | -------------- |
| `groupId`       | string                                     | グループID     |
| `channelId`     | string                                     | チャンネルID   |
| `category`      | string                                     | カテゴリー     |
| `permissions`   | { roleId: string, permissions: string[]}[] | 権限リスト     |
| `beforeEventId` | string                                     | 前のイベントID |

### t.group.sync.channel.remove

チャンネルの削除情報を共有するイベント。

`payload`

| パラメータ      | 型     | 説明           |
| --------------- | ------ | -------------- |
| `groupId`       | string | グループID     |
| `channelId`     | string | チャンネルID   |
| `beforeEventId` | string | 前のイベントID |

### t.group.sync.category.add

カテゴリーの追加情報を共有するイベント。

`payload`

| パラメータ      | 型       | 説明           |
| --------------- | -------- | -------------- |
| `groupId`       | string   | グループID     |
| `categoryId`    | string   | カテゴリーID   |
| `permissions`   | string[] | 権限リスト     |
| `beforeEventId` | string   | 前のイベントID |

### t.group.sync.category.remove

カテゴリーの削除情報を共有するイベント。

`payload`

| パラメータ      | 型     | 説明           |
| --------------- | ------ | -------------- |
| `groupId`       | string | グループID     |
| `categoryId`    | string | カテゴリーID   |
| `beforeEventId` | string | 前のイベントID |

## データの取得

### `GET` /_takos/v1/user/{`key`}/{`userId`}

ユーザーのデータを取得します。

レート制限: なし 認証: なし

keys

- icon - ユーザーアイコン
- nickName - ニックネーム
- description - ユーザーの説明

#### リクエスト

`params`

| パラメータ | 説明       |
| ---------- | ---------- |
| `userId`   | ユーザーID |

#### レスポンス

| 状態 | 説明 |
| ---- | ---- |
| 200  |      |

#### 200

```
{
  `key`: `data`,
}
```

### `GET` /_takos/v1/group/{`key`}/{`groupId`}

グループのデータを取得します。

レート制限: なし 認証: なし

keys

- icon - グループアイコン
- name - グループ名
- description - グループの説明
- owner - オーナーのユーザーID
- defaultChannel - デフォルトチャンネルID
- beforeEventId: string
- channels - チャンネルとcategoryのリスト
- role - ロールのカラーコード
- order - channel/カテゴリーの順番
- members - メンバーのリスト
- all - すべてのデータ

#### リクエスト

`params`

| パラメータ | 説明       |
| ---------- | ---------- |
| `groupId`  | グループID |

#### レスポンス

| 状態 | 説明 |
| ---- | ---- |
| 200  |      |

```ts
icon: base64
name: string
description: string
owner: string
defaultChannel: string
beforeEventId: string
channels: { 
  categories: { 
    id: string; 
    name: string; 
    permissions: {
      roleId: string; 
      permission: string 
    }[]; 
  }[]
  channels: { 
    category: string;
    id: string; 
    name: string; 
    permissions: { 
      roleId: string;
      permission: string 
    }[];
  }[] 
}
order: string[]
role: { color: string; id: string; name: string; permission: string[] }[]
members: { id: string; role: string[] }[]
type: "private" | "public"
all: {
  icon: string;
  name: string;
  description: string;
  owner: string;
  defaultChannel: string;
  beforeEventId: string;
  channels: { 
    categories: { 
      id: string; 
      name: string; 
      permissions: {
        roleId: string; 
        permission: string[]
      }[]; 
    }[]
    channels: { 
      category: string;
      id: string; 
      name: string; 
      permissions: { 
        roleId: string;
        permissions: string[]
      }[];
    }[] 
  }
  order: string[]
  role: { color: string; id: string; name: string; permission: string[] }[]
  members: { id: string; role: string[] }[]
}
```

#### 200

```
{
  `key`: `data`,
}
```

### `GET` /_takos/v1/key/{`kind`}

ユーザーの鍵を取得するエンドポイントです。\
**リクエスト**はクエリパラメーターにて送信します。

#### クエリパラメーター

| パラメーター   | 型     | 説明                                                      |
| -------------- | ------ | --------------------------------------------------------- |
| `userId`       | string | ユーザーID。serverKey以外必須。                           |
| `expire`       | number | serverKeyのみ                                             |
| `hash`         | string | `identityKey` と `roomKey` の場合に必須となるハッシュ値。 |
| `roomId`       | string | `roomKey` の場合かつ`Group`に必要なルームID。             |
| `targetUserId` | string | `roomKey` の場合に必要な相手のユーザーID。                |

#### レスポンス

| 状態 | 説明                     |
| ---- | ------------------------ |
| 200  | 鍵が正常に取得できた場合 |

#### 200 のレスポンス例

```json
{
  "key": "data",
  "signature": "signature"
}
```

### `GET` /_takos/v1/group/search

グループを検索するエンドポイントです。

#### クエリパラメーター

| パラメーター | 型     | 説明           |
| ------------ | ------ | -------------- |
| `query`      | string | キーワード     |
| `limit`      | number | 取得する最大数 |

#### レスポンス

| 状態 | 説明     |
| ---- | -------- |
| 200  | 検索結果 |

#### 200 のレスポンス例

```
{
  "groups": string[]
}
```

### `GET` /_takos/v1/server/{`item`}

サーバーのデータを取得します。

レート制限: なし 認証: なし

items

- name - サーバー名
- description - サーバーの説明
- icon - サーバーアイコン
- version - サーバーバージョン

### `GET` /_takos/v1/message/:`messageId`

メッセージのデータを取得します。

レート制限: なし 認証: なし

#### リクエスト

`params`

| パラメータ  | 説明         |
| ----------- | ------------ |
| `messageId` | メッセージID |

#### レスポンス

| 状態 | 説明 |
| ---- | ---- |
| 200  |      |

#### 200

```
{
  message: message.message,
  signature: message.sign,
  timestamp: message.timestamp,
  userName: message.userName,
}
```
