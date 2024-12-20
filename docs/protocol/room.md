# roomたちの仕様

## friend room

roomid: `<my userId>-<friend userId>`

friendとなっている時点で会話することができる

権限システムなどはない

## group room

roomid: `<group id>@<server domain>`

リーダーがすべての権限を持つ

ホストサーバーのユーザーのみがリーダーになれる

すでに参加しているユーザーがユーザーを招待することができる、リモートサーバーは100まで

メンバーの入退出があった場合、ホストサーバーは`noticeJoinGroup`または`noticeLeaveGroup`、`noticeKickGroup`を利用して他のサーバーに通知を送信する

暗号化されたメッセージを送信することができる

## public group room

roomid: `<group id>@<server domain>`

リーダーがすべての権限を持つ

ホストサーバーのユーザーのみがリーダーになれる

新規のリモートサーバーのユーザーは`requestPublicGroup`を利用して参加を申請しなければならない(リモートサーバーの数は500まで)

それ以外のユーザーはpublicGroupの設定によって申請制か自由参加かが決まる

所属しているサーバーの数が増減した場合、changeRemoteServerPublicGroupを利用して他のサーバーに通知を送信する

暗号化されたメッセージを送信することができる

