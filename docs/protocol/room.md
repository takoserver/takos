# roomたちの仕様

## friend room

roomid: `<my userId>-<friend userId>`

friendとなっている時点で会話することができる

権限システムなどはない

## group room

roomid: `<group id>@<server domain>`

すべてのメンバーがメッセージ送信、キック、メッセージ送信ができる

権限システムなどはない

(各種apiを利用して実装する)

大人数になるとroomKeyの再発行に制限をサーバーがかけることができる

## public group room

roomid: `<group id>@<server domain>`

リーダーがすべての権限を持つ

ホストサーバーのユーザーのみがリーダーになれる

新規のリモートサーバーのユーザーは`requestPublicGroup`を利用して参加を申請しなければならない(リモートサーバーの数は500まで)

それ以外のユーザーはpublicGroupの設定によって申請制か自由参加かが決まる

暗号化されたメッセージは送信できない

メッセージの保持期間は1か月とする 鍵の保持期間はメッセージの保持期間と同じとする
