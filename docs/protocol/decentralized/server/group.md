# groupのホストサーバーに他のサーバーが利用するAPI

## groupのメッセージを削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `messageId`  | string | メッセージのid                       |
| `groupId`    | string | グループのid                        |
| `userId`     | string | メッセージを送ったユーザー          |
| `type`       | string | リクエストの種類（`"deleteMessage"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
  requestId: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```


## groupへの招待

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/invite`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `senderId`   | string | リクエストを送るユーザー            |
| `receiverId` | string | リクエストを送られるユーザー        |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"inviteGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
  requestId: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## 招待を承諾

### エンドポイント情報

- **HTTPメソッド**: POST

- **URLパス**: `/_takos/v2/group/accept`

### ヘッダー

| 名前            | 型     | 説明                                       |
| --------------- | ------ | ------------------------------------------ |
| `Authorization` | string | 認証情報を含むヘッダー（以下の形式で指定） |

**`Authorization`ヘッダーの形式**

```
Authorization: Signature sign="<署名>", Expires="<有効期限>"
```

- `sign`: リクエストボディの署名
- `Expiry`: 鍵の有効期限

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前        | 型     | 説明                           |
| ----------- | ------ | ------------------------------ |
| `userId`    | string | 承諾したユーザー       |
| `groupId`   | string | グループのid                   |
| `type`      | string | リクエストの種類（`"acceptGroupInvite"`） |
| `eventId`   | string | イベントID(uuid v7)                     |



## groupからキック

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/kick`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `receiverId` | string | リクエストを送られるユーザー      |
| `groupId`    | string | グループのid                      |
| `type`       | string | リクエストの種類（`"kickGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## groupから退出

# グループを離脱するapi

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/leave`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前      | 型     | 説明                               |
| --------- | ------ | ---------------------------------- |
| `groupId` | string | グループのid                       |
| `userId`  | string | リクエストを送るユーザー           |
| `type`    | string | リクエストの種類（`"leaveGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## groupのroleの追加

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/role/add`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `roleId`     | string | ロールのid                        |
| `name`       | string | ロールの名前                      |
| `permission` | string[] | ロールの権限                      |
| `type`       | string | リクエストの種類（`"addRole"`）   |
| `eventId`   | string | イベントID(uuid v7)                     |

## groupのroleの削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/role/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `roleId`     | string | ロールのid                        |
| `type`       | string | リクエストの種類（`"deleteRole"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

## groupのroleの編集

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/role/edit`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `roleId`     | string | ロールのid                        |
| `name`       | string | ロールの名前                      |
| `permission` | string[] | ロールの権限                      |
| `type`       | string | リクエストの種類（`"editRole"`）  |
| `eventId`   | string | イベントID(uuid v7)                     |

## userのroleの変更

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/user`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `type`       | string | リクエストの種類（`"changeGroupRole"`） |
| `eventId`   | string | イベントID(uuid v7)                     |
| `userId`     | string | ユーザーのid                      |
| `roleId`     | string | ロールのid                        |
| `change`     | string | 変更の種類（`"add"`または`"remove"`） |

## groupのchannelの追加

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/channel/add`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `type`       | string | リクエストの種類（`"changeGroupRole"`） |
| `eventId`   | string | イベントID(uuid v7)                     |
| `channelId`  | string | チャンネルのid                    |
| `name`       | string | チャンネルの名前                  |
| `roles`       | string[] | チャンネルの権限                  |

## groupのchannelの削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/channel/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `type`       | string | リクエストの種類（`"changeGroupRole"`） |
| `eventId`   | string | イベントID(uuid v7)                     |
| `channelId`  | string | チャンネルのid                    |

## groupのchannelの編集

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/channel/edit`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `senderId`   | string | リクエストを送るユーザー          |
| `groupId`    | string | グループのid                      |
| `type`       | string | リクエストの種類（`"changeGroupRole"`） |
| `eventId`   | string | イベントID(uuid v7)                     |
| `channelId`  | string | チャンネルのid                    |
| `name`       | string | チャンネルの名前                  |
| `roles`       | string[] | チャンネルの権限                  |

## groupのmemberとroleとchannelを取得

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `/_takos/v2/group/info`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                              |
| ------------ | ------ | --------------------------------- |
| `groupId`    | string | グループのid                      |

### レスポンス

レスポンスコード: 200

```ts
{
  members: {
    userId: string;
    role: string;
  }[];
  roles: {
    roleId: string;
    name: string;
    permission: string[];
  }[];
  channels: {
    channelId: string;
    name: string;
    roles: string[];
  }[];
}
```


# groupのホストサーバーから他のサーバーに通知するAPI

## 他のサーバーのユーザーが参加したことを通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/join`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `userId`     | string | 参加したユーザー                    |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeJoinGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## 退出したことを通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/leave`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `userId`     | string | 参加したユーザー                    |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeLeaveGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## キックされたことを通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/kick`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `userId`     | string | 参加したユーザー                    |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeKickGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## roleの追加を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/role/add`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `roleId`     | string | ロールのid                          |
| `name`       | string | ロールの名前                        |
| `permission` | string[] | ロールの権限                        |
| `type`       | string | リクエストの種類（`"noticeAddRoleGroup"`） |
| `eventId`    | string | イベントID(uuid v7)                 |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## roleの削除を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/role/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `roleId`     | string | ロールのid                          |
| `type`       | string | リクエストの種類（`"noticeDeleteRoleGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## roleの編集を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/role/edit`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `roleId`     | string | ロールのid                          |
| `name`       | string | ロールの名前                        |
| `permission` | string[] | ロールの権限                        |
| `type`       | string | リクエストの種類（`"noticeEditRoleGroup"`） |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## ユーザーのroleの変更を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/user`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `userId`     | string | ユーザーのid                        |
| `roleId`     | string | ロールのid                          |
| `change`     | string | 変更の種類（`"add"`または`"remove"`） |
| `type`       | string | リクエストの種類（`"noticeChangeRoleGroup"`） |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## チャンネルの追加を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/channel/add`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `channelId`  | string | チャンネルのid                      |
| `name`       | string | チャンネルの名前                    |
| `roles`      | string[] | チャンネルの権限                    |
| `type`       | string | リクエストの種類（`"noticeAddChannelGroup"`） |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## チャンネルの削除を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/channel/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `channelId`  | string | チャンネルのid                      |
| `type`       | string | リクエストの種類（`"noticeDeleteChannelGroup"`） |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## チャンネルの編集を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/channel/edit`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |
| `channelId`  | string | チャンネルのid                      |
| `name`       | string | チャンネルの名前                    |
| `roles`      | string[] | チャンネルの権限                    |
| `type`       | string | リクエストの種類（`"noticeEditChannelGroup"`） |

### レスポンス

レスポンスコード: 200

```ts
{
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

## groupのメッセージを削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/delete`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `messageId`  | string | メッセージのid                       |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeDeleteMessage"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

## 招待されたことを通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/group/notice/invite`

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

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `senderId`   | string | リクエストを送るユーザー            |
| `receiverId` | string | リクエストを送られるユーザー        |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeInviteGroup"`） |
| `eventId`   | string | イベントID(uuid v7)                     |

### レスポンス

レスポンスコード: 200

```ts
{
  requestId: string;
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```