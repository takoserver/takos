# Protocolのapiを利用して行う処理

※これらは外部サーバー向けのapiのみを記述している。

## friend登録を行う

`requestFriend` apiを利用して別サーバーにfriend登録リクエストを送信する。

`accept` apiを利用してリクエストを受け入れることにより、friend登録が完了する。

`reject` apiを利用してリクエストを拒否することにより、friend登録がキャンセルされる。

## groupへの招待

`inviteGroup` apiを利用して、groupに招待する。
frindであることが前提。

`accept` apiを利用して招待を受け入れることにより、groupに参加する。

`reject` apiを利用して招待を拒否することにより、groupへの参加がキャンセルされる。

## groupからの脱退

`leaveGroup` apiを利用して、groupから脱退する。

## groupでのkick

`kickGroup` apiを利用して、groupからkickする。

## groupの削除

`deleteGroup` apiを利用して、groupを削除したことを通知する。

## friendのチャット

`sendFriendMessage` apiを利用して、friendに対してメッセージを送信する。

idのみ送信し、メッセージはクライアントが各サーバーに対して直接getする。

## groupでのチャット

`sendGroupMessage` apiを利用して、メッセージを送信する。

メッセージのidを参加している全てのサーバーに送信する。

groupとpublicGroupは外部サーバーの数が1000を超える場合、新たなサーバーのユーザーは参加できない。

## publicGroupでのチャット

`sendPublicGroupMessage` apiを利用して、メッセージを送信する。

メッセージのidを参加している全てのサーバーに送信する。

friendとgroupの違いは、暗号化しないことでNotEncryptedMessageのみを送信することができる。

## friendの削除

`deleteFriend` apiを利用して、friendを削除する。

## friendのブロック

`blockFriend` apiを利用して、friendをブロックする。

## friendのブロック解除

`unblockFriend` apiを利用して、friendのブロックを解除する。

## publicGroupへの参加

`joinPublicGroup` apiを利用して、publicGroupに参加する。

## publicGroupからの脱退

`leavePublicGroup` apiを利用して、publicGroupから脱退する。

## publicGroupの参加申請

`requestPublicGroup` apiを利用して、publicGroupに参加申請する。

`accept` apiを利用して参加申請を受け入れることにより、publicGroupに参加する。

`reject` apiを利用して参加申請を拒否することにより、publicGroupへの参加がキャンセルされる。

