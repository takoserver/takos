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

暗号化されたメッセージを送信することができる

## public group room

roomid: `<group id>@<server domain>`

リーダーがすべての権限を持つ

ホストサーバーのユーザーのみがリーダーになれる

新規のリモートサーバーのユーザーは`requestPublicGroup`を利用して参加を申請しなければならない(リモートサーバーの数は100まで)

それ以外のユーザーはpublicGroupの設定によって申請制か自由参加かが決まる

暗号化されたメッセージを送信することができる

## メッセージのid保存

messageIdはホームサーバーが受信した順にメッセージのidを保存する

## groupとpublic groupでのメンバー管理

参加するユーザーのサーバーとホストサーバーが同時に保存することで参加していることになる

メンバーの招待、参加、退出、削除はgroupのホストサーバーが他の参加しているサーバーに通知する

チャンネルの追加、削除、編集も同様

ロールの変更も同様

他のサーバーのメンバーが権限を与えられている場合groupのホストサーバーのapiを利用して変更することができる

ホストではないサーバーがダウンしていた場合、groupのホストサーバーからgroupの情報を取得する

ホストサーバーがダウンしてる時、退出することのみできる
