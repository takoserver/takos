## role

権限をユーザーに付与することができる。

デフォルトのロール

- `admin`: グループの管理者 すべての権限を持つ。
- `member`: グループのメンバー すべてのメンバーが持つ権限。

デフォルトのロールは削除することはできない

adminは内容も変更できない

permissionは以下のものがある

permissionは everyone->role->user->category->channelの順で上書きされる

## サーバー全体のpermission

- `ADMIN`: グループの管理者 すべての権限を持つ。
- `MANAGE_CHANNEL`: チャンネル・categoryの管理
- `MANAGE_USER`: ユーザーの管理
- `INVITE_USER`: ユーザーの招待
- `MANAGE_SERVER`: サーバーの設定変更
- `VIEW_LOG`: ログの閲覧

## text channelのpermission

- `SEND_MESSAGE`: メッセージの送信
- `VIEW_MESSAGE`: メッセージの閲覧
- `MENTION_USER`: ユーザーのメンション
- `MANAGE_MESSAGE`: メッセージの管理

## categoryのpermission

- `VIEW_MESSAGE`: メッセージの閲覧
- `SEND_MESSAGE`: メッセージの送信
- `MENTION_USER`: ユーザーのメンション
- `MANAGE_MESSAGE`: メッセージの管理

MANAGE_ROLEは自身の権限よりも低いロール
