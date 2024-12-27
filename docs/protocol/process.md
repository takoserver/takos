# Protocolのapiを利用して行う処理

※これらは外部サーバー向けのapiのみを記述している。

## friend登録を行う

`requestFriend` apiを利用して別サーバーにfriend登録リクエストを送信する。

`accept` apiを利用してリクエストを受け入れることにより、friend登録が完了する。

`reject`
apiを利用してリクエストを拒否することにより、friend登録がキャンセルされる。

## groupへの招待

`invite`apiを利用してgroupのホストサーバーに招待を送信する。

ホストサーバーは`noticeInvite`apiを利用して招待されたユーザーに通知を送信する。

招待されたユーザーは`accept`apiを利用してホストサーバーに招待を受け入れることにより、groupに参加することができる。

`reject`apiを利用して招待を拒否することにより、groupへの参加をキャンセルすることができる。

acceptした場合、ホストサーバーは`noticeJoinGroup`apiを利用してgroupに参加しているサーバーに通知を送信する。

## groupへのkick

※リーダーが権限を与えた場合のみ利用可能

`kick`apiを利用してgroupのホストサーバーにkickリクエストを送信する。

ホストサーバーは`noticeKick`apiを利用してkickされたユーザーに通知を送信する。

## groupのiconを変更する

※リーダーが権限を与えた場合のみ利用可能

`changeGroupIcon`apiを利用してgroupのiconを変更する。

`noticeChangeGroupIcon`apiを利用してgroupに参加しているサーバーに通知を送信する。

## groupのnameを変更する

※リーダーが権限を与えた場合のみ利用可能

`changeGroupName`apiを利用してgroupのnameを変更する。

`noticeChangeGroupName`apiを利用してgroupに参加しているサーバーに通知を送信する。

## groupのdescriptionを変更する

※リーダーが権限を与えた場合のみ利用可能

`changeGroupDescription`apiを利用してgroupのdescriptionを変更する。

`noticeChangeGroupDescription`apiを利用してgroupに参加しているサーバーに通知を送信する。

## groupから退出する

`leaveGroup`apiを利用してgroupのホストサーバーに退出リクエストを送信する。

ホストサーバーは`noticeLeaveGroup`apiを利用してgroupに参加しているサーバーに通知を送信する。

## groupに参加しているユーザーを取得する

### ホストサーバーがオンラインの場合

`getGroupMembers`apiを利用してgroupに参加しているユーザーを取得する。

### ホストサーバーがオフラインの場合

自サーバーに保存されているgroupの情報を利用してgroupに参加しているユーザーを取得する。

## public groupへの参加をリクエスト

`requestJoinPublicGroup`apiを利用してpublic
groupのホストサーバーに参加リクエストを送信する。

`accept`apiを利用してリクエストを受け入れることにより、public
groupに参加することができる。

`reject`apiを利用してリクエストを拒否することにより、public
groupへの参加をキャンセルすることができる。

## public groupへ参加する

(自由にさんかできる設定で且つ、すでに同じサーバーのユーザーが参加している場合)

`joinPublicGroup`apiを利用してpublic groupに参加する。

## public groupから退出する

`leavePublicGroup`apiを利用してpublic
groupのホストサーバーに退出リクエストを送信する。

# groupでの会話を行う

メッセージを送信する場合は、`sendMessage`apiを利用して参加しているすべてのサーバーにメッセージを送信する。

# public groupでの会話を行う

メッセージを送信する場合は、`sendPublicMessage`apiを利用して参加しているすべてのサーバーにメッセージを送信する。
