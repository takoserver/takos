# publicGroupのホストサーバーに他のサーバーが利用するAPI

## groupのメッセージを削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/delete`

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

## publicGroupに参加を申請するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/request`

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
| `userId`     | string | リクエストを送るユーザー            |
| `type`       | string | リクエストの種類（`"publicGroupRequest"`）     |
| `eventId`    | string | イベントID(uuid v7)                 |


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

## publicGroupへ参加するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/join`

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
| `userId`     | string | リクエストを送るユーザー            |
| `type`       | string | リクエストの種類（`"publicGroupJoin"`）     |
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

## publicGroupから退出するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/leave`

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
| `userId`     | string | リクエストを送るユーザー            |
| `type`       | string | リクエストの種類（`"publicGroupLeave"`）     |
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

## publicGroupへの参加を承認するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/accept`

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
| `userId`     | string | リクエストを送るユーザー            |
| `type`       | string | リクエストの種類（`"publicGroupAccept"`）     |
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

## publicGroupへの参加を拒否するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/reject`

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
| `userId`     | string | リクエストを送るユーザー            |
| `type`       | string | リクエストの種類（`"publicGroupReject"`）     |
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

## publicGroupのroleの追加

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/role/add`

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
| `name`       | string | ロール名                            |
| `permissions`| string | 権限                                |
| `type`       | string | リクエストの種類（`"publicGroupRoleAdd"`）     |
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

## publicGroupのroleの削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/role/delete`

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
| `type`       | string | リクエストの種類（`"publicGroupRoleDelete"`）     |
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

## publicGroupのroleの編集

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/role/edit`

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
| `name`       | string | ロール名                            |
| `permissions`| string | 権限                                |
| `type`       | string | リクエストの種類（`"publicGroupRoleEdit"`）     |
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

## userのroleの変更

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/user`

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
| `userId`     | string | ユーザーのid                        |
| `type`       | string | リクエストの種類（`"publicGroupUser"`）     |
| `eventId`    | string | イベントID(uuid v7)                 |
| `change`     | string | 変更の種類（`"add"`または`"remove"`） |


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

## publicGroupのchannelの追加

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/channel/add`

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
| `name`       | string | チャンネル名                        |
| `role`       | string[] | 会話できる権限                      |
| `type`       | string | リクエストの種類（`"publicGroupChannelAdd"`）     |
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

## publicGroupのchannelの削除

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/channel/delete`

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
| `type`       | string | リクエストの種類（`"publicGroupChannelDelete"`）     |
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

## publicGroupのchannelの編集

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/channel/edit`

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
| `name`       | string | チャンネル名                        |
| `role`       | string | 会話できる権限                      |
| `type`       | string | リクエストの種類（`"publicGroupChannelEdit"`）     |
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

## groupのmemberとroleとchannelを取得

### エンドポイント情報

- **HTTPメソッド**: GET
- **URLパス**: `/_takos/v2/publicGroup/info`

### リクエストボディ

リクエストのボディは、JSON形式で以下の内容を含みます。

| 名前         | 型     | 説明                                |
| ------------ | ------ | ----------------------------------- |
| `groupId`    | string | グループのid                        |


### レスポンス

レスポンスコード: 200

```ts
{
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
}
```

レスポンスコード: 400

```ts
{
  error: string;
}
```

# publicGroupのホストサーバーから他のサーバーに通知するAPI

## ユーザーが参加したことを通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/join`

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
| `type`       | string | リクエストの種類（`"noticeJoinPublicGroup"`）     |
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

## ユーザーが退出したことを通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/leave`

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
| `type`       | string | リクエストの種類（`"noticeLeavePublicGroup"`）     |
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


## ユーザーがキックされたことを通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/kick`

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
| `type`       | string | リクエストの種類（`"noticeKickPublicGroup"`）     |
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

## roleの追加を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/role/add`

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
| `roleId`     | string | ロールのid                          |
| `name`       | string | ロール名                            |
| `permissions`| string | 権限                                |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeRoleAddPublicGroup"`）     |
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

## roleの削除を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/role/delete`

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
| `roleId`     | string | ロールのid                          |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeRoleAddPublicGroup"`）     |
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

## roleの編集を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/role/edit`

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
| `roleId`     | string | ロールのid                          |
| `name`       | string | ロール名                            |
| `permissions`| string | 権限                                |
| `groupId`    | string | グループのid                        |
| `type`       | string | リクエストの種類（`"noticeRoleEditPublicGroup"`）     |
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

## ユーザーのroleの変更を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/user`

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
| `type`       | string | リクエストの種類（`"noticeChangeRolePublicGroup"`） |

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

## channelの追加を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/channel/add`

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
| `type`       | string | リクエストの種類（`"noticeAddChannelPublicGroup"`） |

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

## channelの削除を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/channel/delete`

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
| `type`       | string | リクエストの種類（`"noticeDeleteChannelPublicGroup"`） |

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


## channelの編集を通知するAPI

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/channel/edit`

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

## groupのメッセージを削除を通知

### エンドポイント情報

- **HTTPメソッド**: POST
- **URLパス**: `/_takos/v2/publicGroup/notice/delete`

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
| `type`       | string | リクエストの種類（`"deleteMessage"`） |
| `eventId`   | string | イベントID(uuid v7)                     |