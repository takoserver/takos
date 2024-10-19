# takosの基本的な仕様

## 概要

takosは、分散型のチャットシステムです。\
matrixとLINEの良いとこどりをしたようなシステムです。

### アカウントの要素

- **userName**: サーバー内のユーザーの名前。英数字とアンダースコアのみ。
- **userId**:
  外部サーバーでも利用できるユーザーの名前。英数字とアンダースコアのみ@サーバー名。
- **keys**: 暗号化/署名用の鍵(別途説明)。
- **icon**: ユーザーのアイコン。
- **statusMessage**: ユーザーのステータスメッセージ。
- **status**: ユーザーのステータス。

### デバイス間での同期

デバイス間での同期は、サーバーを介して行われます。
使用される鍵は、keyShareKeyとKeyShareSignKeyです。

共有されるデータは次の通りです:

- **identityKey**
- **accountKey**
- **masterKey**
- **masterKeyの検証情報**

### 新規デバイスの追加

新規デバイスの追加は、サーバーを介して行われます。
使用される鍵は、migrateKeyとmigrateDataSignKeyです。

共有されるデータは次の通りです:

- **masterKey**
- **identityKey**
- **accountKey**
- **masterKey**
- **masterKeyの検証情報**

### フレンド機能

フレンドになることでできること:

- フレンドのステータスを見ることができる。
- フレンドのアイコンを見ることができる。
- フレンドのステータスメッセージを見ることができる。
- DMを送ることができる。
- groupに招待することができる。

### メッセージの送受信

roomには種類があり次の3つがある:

- friend
- group
- community

#### friend

フレンドとのDMを行うためのroom。\
channel機能はない。 friendでなければ会話を行うことはできない。

roomidは以下のようになる:

- AのuserId: takos@takos.jp
- BのuserId: takos@takos2.jp

送信者がAの場合:

- roomid: takos@takos.jp-takos@takos2.jp

送信者がBの場合:

- roomid: takos@takos2.jp-takos@takos.jp

roomKeyで暗号化してidentityKeyで署名する。

#### group

グループチャットを行うためのroom。

roomidはクライアントで生成される。

roomidは以下のようになる:

uuidv7@takos.jp

roomKeyで暗号化してidentityKeyで署名する。

#### community

コミュニティチャットを行うためのroom。

roomidは以下のようになる:

- uuidv7@takos.jp

暗号化や署名は行わない。

## 暗号化/署名

ここでは他のユーザーとの通信に利用する鍵について説明します。

- **masterKey**\
  ユーザーの鍵を生成するための鍵。ユーザーが生成したidentityKeyの署名に利用される。
- **identityKey** 署名用の鍵。メッセージや鍵の署名に利用される。
- **accountKey** 暗号化用の鍵。鍵の暗号化に利用される。
- **roomKey** ルームの鍵。メッセージの暗号化に利用される。

### masterKeyの検証と承認

masterKeyは検証し、承認することで本人がidentityKeyやaccountKeyを生成したことを確認します。

### メッセージの暗号化プロセス

1. roomKeyを作成する。
2. roomKeyを相手の暗号化用の鍵で暗号化する。
3. 自分用にroomKeyを暗号化/署名する。 ※ roomKeyを作成済みの場合はここから
4. メッセージにroomid,timestampを付与する。
5. メッセージをroomKeyで暗号化する。
6. メッセージをidentityKeyで署名する。

### 暗号化の信頼性の説明

- **前方秘匿性**\
  roomKeyは任意のタイミングで更新することができるので、前方秘匿性を保つことができます。

- **偽造防止**
  identityKeyで署名することで、メッセージの偽造を防ぐことができます。

- **リプレイ攻撃対策**
  timestampを付与することで、リプレイ攻撃を防ぐことができます。
  また、roomidを付与することで、他のroomでのリプレイ攻撃を防ぐことができます。
