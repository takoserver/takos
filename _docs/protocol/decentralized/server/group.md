# groupのホストサーバーに他のサーバーが利用するAPI(groupの機能)

## groupの操作

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/<path>`

### ヘッダー

| 名前            | 型     | 説明                                       |
| --------------- | ------ | ------------------------------------------ |
| `Authorization` | string | 認証情報を含むヘッダー（以下の形式で指定） |

**`Authorization`ヘッダーの形式**:

```
Authorization: Signature sign="<署名>", Expires="<有効期限>"
```

- `sign`: リクエストボディの署名
- `Expiry`: 鍵の有効期限

## チャンネルの作成 ok

type: `createChannel`

path: `channel/create`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型                                               | 説明                       |
| ------------ | ------------------------------------------------ | -------------------------- |
| `groupId`    | string                                           | グループのid               |
| `userId`     | string                                           | メッセージを送ったユーザー |
| `type`       | string                                           | リクエストの種類           |
| `eventId`    | string                                           | イベントID(uuid v7)        |
| `id`         | string                                           | チャンネルのid             |
| `name`       | string or undefind                               | チャンネルの名前           |
| `category`   | string or undefind                               | カテゴリーのid             |
| `permission` | {id: string, permission: string[]}[] or undefind | パーミッションの設定       |

## チャンネルの削除 ok

type: `deleteChannel`

path: `channel/delete`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `id`      | string | チャンネルのid             |
| `groupId` | string | グループのid               |
| `userId`  | string | メッセージを送ったユーザー |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

## カテゴリーの作成

type: `createCategory`

path: `category/create`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型                                               | 説明                       |
| ------------ | ------------------------------------------------ | -------------------------- |
| `groupId`    | string                                           | グループのid               |
| `userId`     | string                                           | メッセージを送ったユーザー |
| `type`       | string                                           | リクエストの種類           |
| `eventId`    | string                                           | イベントID(uuid v7)        |
| `id`         | string                                           | カテゴリーのid             |
| `name`       | string or undefind                               | カテゴリーの名前           |
| `permission` | {id: string, permission: string[]}[] or undefind | パーミッションの設定       |

## カテゴリーの削除

type: `deleteCategory`

path: `category/delete`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `id`      | string | カテゴリーのid             |
| `groupId` | string | グループのid               |
| `userId`  | string | メッセージを送ったユーザー |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

## roleの作成 ok

type: `createRole`

path: `role/create`

### リクエストボディ

| 名前         | 型                   | 説明                       |
| ------------ | -------------------- | -------------------------- |
| `groupId`    | string               | グループのid               |
| `userId`     | string               | メッセージを送ったユーザー |
| `type`       | string               | リクエストの種類           |
| `eventId`    | string               | イベントID(uuid v7)        |
| `id`         | string               | ロールのid                 |
| `name`       | string or undefind   | ロールの名前               |
| `permission` | string[] or undefind | パーミッションの設定       |
| `color`      | string or undefind   | ロールの色                 |

## roleの削除 ok

type: `deleteRole`

path: `role/delete`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `id`      | string | ロールのid                 |
| `groupId` | string | グループのid               |
| `userId`  | string | メッセージを送ったユーザー |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

## serverの編集 ok

type: `editServer`

path: `server/edit`

### リクエストボディ

| 名前          | 型                 | 説明                       |
| ------------- | ------------------ | -------------------------- |
| `groupId`     | string             | グループのid               |
| `userId`      | string             | メッセージを送ったユーザー |
| `type`        | string             | リクエストの種類           |
| `eventId`     | string             | イベントID(uuid v7)        |
| `name`        | string or undefind | サーバーの名前             |
| `icon`        | string or undefind | サーバーのアイコン         |
| `description` | string or undefind | サーバーの説明             |

## 招待 ok

type: `inviteUser`

path: `user/invite`

### リクエストボディ

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `groupId`      | string | グループのid               |
| `userId`       | string | メッセージを送ったユーザー |
| `type`         | string | リクエストの種類           |
| `eventId`      | string | イベントID(uuid v7)        |
| `inviteUserId` | string | 招待するユーザーのid       |

## 招待の取り消し

type: `cancelInvite`

path: `user/cancel`

### リクエストボディ

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `groupId`      | string | グループのid               |
| `userId`       | string | メッセージを送ったユーザー |
| `type`         | string | リクエストの種類           |
| `eventId`      | string | イベントID(uuid v7)        |
| `inviteUserId` | string | 招待するユーザーのid       |

## 参加を許可 ok

type: `acceptJoin`

path: `user/accept`

### リクエストボディ

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `groupId`      | string | グループのid               |
| `userId`       | string | メッセージを送ったユーザー |
| `type`         | string | リクエストの種類           |
| `eventId`      | string | イベントID(uuid v7)        |
| `inviteUserId` | string | 招待するユーザーのid       |

## 参加を拒否 ok

type: `rejectJoin`

path: `user/reject`

### リクエストボディ

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `groupId`      | string | グループのid               |
| `userId`       | string | メッセージを送ったユーザー |
| `type`         | string | リクエストの種類           |
| `eventId`      | string | イベントID(uuid v7)        |
| `inviteUserId` | string | 招待するユーザーのid       |

## サーバーの追加 ok

type: `addServer`

path: `server/add`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `groupId` | string | グループのid               |
| `userId`  | string | メッセージを送ったユーザー |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |
| `server`  | string | 追加するサーバーのid       |

## サーバーの削除 ok

type: `deleteServer`

path: `server/delete`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `groupId` | string | グループのid               |
| `userId`  | string | メッセージを送ったユーザー |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |
| `server`  | string | 削除するサーバーのid       |

## memberをキック ok

type: `kickUser`

path: `user/kick`

### リクエストボディ

| 名前         | 型     | 説明                       |
| ------------ | ------ | -------------------------- |
| `groupId`    | string | グループのid               |
| `userId`     | string | メッセージを送ったユーザー |
| `type`       | string | リクエストの種類           |
| `eventId`    | string | イベントID(uuid v7)        |
| `kickUserId` | string | キックするユーザーのid     |

## memberをban ok

type: `banUser`

path: `user/ban`

### リクエストボディ

| 名前        | 型     | 説明                       |
| ----------- | ------ | -------------------------- |
| `groupId`   | string | グループのid               |
| `userId`    | string | メッセージを送ったユーザー |
| `type`      | string | リクエストの種類           |
| `eventId`   | string | イベントID(uuid v7)        |
| `banUserId` | string | banするユーザーのid        |

## memberのbanを解除 ok

type: `unbanUser`

path: `user/unban`

### リクエストボディ

| 名前        | 型     | 説明                       |
| ----------- | ------ | -------------------------- |
| `groupId`   | string | グループのid               |
| `userId`    | string | メッセージを送ったユーザー |
| `type`      | string | リクエストの種類           |
| `eventId`   | string | イベントID(uuid v7)        |
| `banUserId` | string | banを解除するユーザーのid  |

## memberのroleを追加 ok

type: `addUserRole`

path: `user/role/add`

### リクエストボディ

| 名前        | 型     | 説明                       |
| ----------- | ------ | -------------------------- |
| `groupId`   | string | グループのid               |
| `userId`    | string | メッセージを送ったユーザー |
| `type`      | string | リクエストの種類           |
| `eventId`   | string | イベントID(uuid v7)        |
| `addUserId` | string | roleを追加するユーザーのid |
| `roleId`    | string | 追加するroleのid           |

## memberのroleを削除 ok

type: `deleteUserRole`

path: `user/role/delete`

### リクエストボディ

| 名前           | 型     | 説明                       |
| -------------- | ------ | -------------------------- |
| `groupId`      | string | グループのid               |
| `userId`       | string | メッセージを送ったユーザー |
| `type`         | string | リクエストの種類           |
| `eventId`      | string | イベントID(uuid v7)        |
| `deleteUserId` | string | roleを削除するユーザーのid |
| `roleId`       | string | 削除するroleのid           |

# groupのホストサーバーに他のサーバーが利用するAPI(その他)

## groupへの参加(public) ok

type: `joinGroup`

path: `group/join`

### リクエストボディ

| 名前      | 型     | 説明                 |
| --------- | ------ | -------------------- |
| `groupId` | string | グループのid         |
| `userId`  | string | 参加するユーザーのid |
| `type`    | string | リクエストの種類     |
| `eventId` | string | イベントID(uuid v7)  |

## groupへの参加リクエスト(public) ok

type: `requestJoinGroup`

path: `group/join/request`

### リクエストボディ

| 名前      | 型     | 説明                             |
| --------- | ------ | -------------------------------- |
| `groupId` | string | グループのid                     |
| `userId`  | string | 参加リクエストを送るユーザーのid |
| `type`    | string | リクエストの種類                 |
| `eventId` | string | イベントID(uuid v7)              |

## groupへの参加リクエストの取り消し(public) ok

type: `cancelRequestJoinGroup`

path: `group/join/cancel`

### リクエストボディ

| 名前      | 型     | 説明                                 |
| --------- | ------ | ------------------------------------ |
| `groupId` | string | グループのid                         |
| `userId`  | string | 参加リクエストを取り消すユーザーのid |
| `type`    | string | リクエストの種類                     |
| `eventId` | string | イベントID(uuid v7)                  |

## groupへの招待を承認(private) ok

type: `acceptInviteGroup`

path: `group/inivte/accept`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `groupId` | string | グループのid               |
| `userId`  | string | 招待を承認するユーザーのid |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

## groupへの招待を拒否(private) ok

type: `rejectInviteGroup`

path: `group/inivte/reject`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `groupId` | string | グループのid               |
| `userId`  | string | 招待を拒否するユーザーのid |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

## groupから退出 ok

type: `leaveGroup`

path: `group/leave`

### リクエストボディ

| 名前      | 型     | 説明                       |
| --------- | ------ | -------------------------- |
| `groupId` | string | グループのid               |
| `userId`  | string | 招待を拒否するユーザーのid |
| `type`    | string | リクエストの種類           |
| `eventId` | string | イベントID(uuid v7)        |

# groupの変更を他のサーバーに通知するAPI

## groupの変更通知

type: `updateGroup`

path: `group/update`

### リクエストボディ

| 名前            | 型     | 説明                     |
| --------------- | ------ | ------------------------ |
| `groupId`       | string | 変更があったグループのid |
| `userId`        | string | 変更を行ったユーザーのid |
| `type`          | string | 変更の種類               |
| `eventId`       | string | イベントID(uuid v7)      |
| `method`        | string | 変更の対象               |
| `operation`     | string | 変更の操作               |
| `beforeEventId` | string | 前のイベントID(uuid v7)  |
| `data`          | Data   | 変更内容                 |

```ts
type Data = ChannelData | CategoryData | RoleData | MemberData;

interface ChannelData {
  id: string;
  category: string;
  permission: { id: string; permission: string[] }[];
  order: number;
}
[];

interface CategoryData {
  id: string;
  permission: { id: string; permission: string[] }[];
  order: number;
}
[];

interface RoleData {
  id: string;
  permission: string[];
}
[];

interface MemberData {
  id: string;
  role: string[];
}
[];
```

## grouoのデータを取得

method: `GET`

path: `group/get`

query: `groupId=<string>`

resp

```ts
interface GroupData {
  category: CategoryData;
  channel: ChannelData;
  role: RoleData;
  member: MemberData;
}
```
