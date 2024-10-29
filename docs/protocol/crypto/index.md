# 分散型チャットサービスでのE2EE暗号化

## はじめに

このドキュメントは、分散型チャットサービスでのE2EE暗号化について説明します。

## E2EE暗号化とは

E2EE暗号化（End-to-End
Encryption）は、通信の送信者と受信者の間でのみ復号化できる暗号化方式です。中間者攻撃に対して強力なセキュリティを提供します。

## tako'sのE2EE暗号化の基本的な仕組み

masterKeyをユーザー間で正しいことを確認し、masterKeyで署名された鍵を利用して暗号化を行います。

masterKeyのほかに以下の鍵が利用されます。

- identityKey
- accountKey
- roomKey
- deviceKey
- keyShareKey
- keyShareSignKey
- migrateKey
- migrateDataSignKey

masterKeyを含め後程詳しく説明します。

## 暗号化プロセス

### ハッシュ値の生成

sha256を利用してハッシュ値を生成します。

masterKeyの承認する場合はハッシュ値に加え、soltを追加したハッシュ値も生成します。

### 鍵の役割

- **masterKey**
  すべての鍵の信用の根拠となる鍵。この鍵を何らかの方法で共有して信頼する。

- **identityKey**\
  他のユーザーに送信するroomKeyやメッセージの署名に使用する。これにより、roomKeyが送信者によって本当に生成されたものであることが保証される。\
  signはkeyとtimestampのバイナリデータを連結して、masterKeyで署名する。

- **accountKey**\
  identityKeyによって署名されている暗号用の鍵。roomKeyを送信するために使用される。

- **roomKey**\
  各チャットルーム内のメッセージを暗号化するための共通鍵。メッセージ送信時には、全参加者のaccountKeyで暗号化して配布する。\
  自ら作成した鍵は自らのメッセージのみを暗号化するために使用し、他のユーザーは原則利用しない。

- **deviceKey**\
  デバイスに保存されるデータを暗号化するための鍵。サーバーとクライアント双方で利用される共通鍵。

- **keyShareKey**\
  デバイス間でidentityKeyやaccountKeyやmasterKeyの承認情報を共有するための鍵。

- **KeyShareSignKey**\
  keyShareKeyで暗号化されたデータを署名するための鍵。

- **migrateKey**\
  デバイスの鍵を移行するための鍵。

- **migrateDataSignKey**\
  migrateKeyで暗号化されたデータを署名するための鍵。

### masterKeyの検証と承認

masterKeyは検証し、承認することで本人がidentityKeyやaccountKeyを生成したことを確認します。masterKeyの検証は何らかの方法で本物であることを確認することで行います。

#### 方法

- QRコード
- ハッシュ値の比較
- 他のユーザーによる承認

承認したユーザーはidentityKeyの署名を検証し、確認します。承認した後、異なるmasterKeyで署名されたidentityKeyやaccountKeyを検知した場合、認証を破棄します。

また、後述するroomKeyで認証よりも後に作られた異なるmasterKeyで署名されたaccountKeyで暗号化したものを受信した場合、認証を破棄します。

古いroomKeyを渡された場合でも、認証されている状態で認証されていないaccountKeyで暗号化して送信したroomKeyで暗号化することはありません。

### identityKeyとaccountKeyの生成と共有、更新

identityKeyを生成し、masterKeyで署名してaccountKeyを生成し、identityKeyで署名する。
各公開鍵をサーバーにアップロードし、必要なときにサーバーは公開鍵を他のユーザーに配布する。
identityKeyとaccountKeyは定期的に更新される。(頻度はユーザーが設定可能)

更新された鍵は既存のaccountKeyで暗号し既存のidentityKeyで署名して配布する。

各デバイスは各アカウントの最新のidentityKeyのtimestampを保持している。
古いidentityKeyで署名されたaccountKeyを利用して暗号化することはできない。

相手の鍵が2年以上更新されていない場合警告を表示する。

### roomKeyの生成と共有、更新

roomKeyを生成し、各ユーザーのaccountKeyで暗号化して配布する。
roomKeyは定期的に更新される。(頻度はユーザーが設定可能)
自分用のroomKeyは署名も送信する。
roomKeyに暗号化に利用したaccountKeyのmasterKeyのハッシュ値を含める。(自らのaccountKeyで暗号化するもののみ)
認証している鍵は認証で利用したsoltとそのハッシュも含める。
roomKeyにroomidを含める。

masterKeyを認証した後、古いroomKeyでも認証されたものと同じmasterKeyで署名されたaccountKeyで暗号化して送信したroomKeyの場合継続して利用できる。

### 信頼情報の共有

KeyShareKeyで暗号化してKeyShareSignKeyで署名された鍵を他のデバイスに配布する。

### メッセージの暗号化

roomKeyで暗号化してidentityKeyで署名する。

**リプレイ攻撃対策**

timestampは同じユーザーで一意である必要がある。
serverから伝えられたtimestampとメッセージに付属したtimestampが1分以上ずれている場合は拒否する。
roomKeyのroomidと一致している必要がある。

攻撃の標的はできるのはリプレイ攻撃元のグループと攻撃先のグループのどちらも入っている場合のみである。

**トーク履歴のルール**

identityKeyは連続してのみ使用できる。
サーバーのtimestampによってメッセージの表示順が決定される。

## 鍵の定義

型に利用する単語の説明や、その単語に含む値の説明を記載します。

- timestamp

ISO8601形式の文字列