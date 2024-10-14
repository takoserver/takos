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

- **identityKey**  
  他のユーザーに送信するroomKeyやメッセージの署名に使用する。これにより、roomKeyが送信者によって本当に生成されたものであることが保証される。  
  signはkeyとtimestampのバイナリデータを連結して、masterKeyで署名する。

- **accountKey**  
  identityKeyによって署名されている暗号用の鍵。roomKeyを送信するために使用される。

- **roomKey**  
  各チャットルーム内のメッセージを暗号化するための共通鍵。メッセージ送信時には、全参加者のaccountKeyで暗号化して配布する。  
  自ら作成した鍵は自らのメッセージのみを暗号化するために使用し、他のユーザーは原則利用しない。

- **deviceKey**  
  デバイスに保存されるデータを暗号化するための鍵。サーバーとクライアント双方で利用される共通鍵。

- **keyShareKey**  
  デバイス間でidentityKeyやaccountKeyやmasterKeyの承認情報を共有するための鍵。

- **KeyShareSignKey**  
  keyShareKeyで暗号化されたデータを署名するための鍵。

- **migrateKey**  
  デバイスの鍵を移行するための鍵。

- **migrateDataSignKey**  
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

更新された鍵はKeyShareKeyで暗号化されKeyShareSignKeyで署名して各デバイスに配布される。
デバイスは最新の鍵のみを保持する。

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

### MasterKey

現在サポートしている鍵のアルゴリズム
 - ml_dsa87

```ts
type MasterKey = {
  public: MasterKeyPub
  private: MasterKeyPrivate
  hashHex: string
  version: number
}

type MasterKeyPub = {
  key: string
  keyType: "masterPub"
  version: number
}

type MasterKeyPrivate = {
  key: string
  keyType: "masterPrivate"
  version: number
}
```

### identityKey

現在サポートしている鍵のアルゴリズム
 - ml_dsa65

signするデーターはkeyとtimestampのバイナリデータを連結して、masterKeyで署名する。

```ts
type IdentityKey = {
  public: IdentityKeyPub
  private: IdentityKeyPrivate
  hashHex: string
  version: number
}

type IdentityKeyPub = {
  key: string
  sign: Sign
  timestamp: string
  keyType: "identityPub"
  version: number
}

// Identity Keyの秘密鍵情報を格納する型
type IdentityKeyPrivate = {
  key: string // 秘密鍵
  keyType: "identityPrivate" // 鍵の種類
  version: number // 鍵のバージョン
}
```

### accountKey

現在サポートしている鍵のアルゴリズム
 - ml_kem768

```ts
type AccountKeyPub = {
  key: string
  sign: Sign
  keyType: "accountPub"
  version: number
}

type AccountKeyPrivate = {
  key: string
  keyType: "accountPrivate"
  version: number
}

type AccountKey = {
  public: AccountKeyPub
  private: AccountKeyPrivate
  hashHex: string
  version: number
}
```

### roomKey

アルゴリズムはAESのみをサポートする。

```ts
interface RoomKey {
  key: string
  sign: Sign
  keyType: "roomKey"
  timestamp: string // 鍵の作成日時
  hashHex: string
  version: number
  masterKeysHashHex: string[]
  roomid: string
}
```

### KeyShareKey

各デバイス間でidentityKeyとaccountKeyや認識や承認した鍵を共有するための鍵。
アルゴリズムはml_kem768をサポートする。

```ts
interface KeyShareKeyPub {
  key: string
  sign: Sign // 署名情報
  keyType: "keySharePub" // 鍵の種類
  timestamp: string // 鍵の作成日時
  version: number // 鍵のバージョン
}
interface KeyShareKeyPrivate {
  key: string
  keyType: "keySharePrivate" // 鍵の種類
}
interface KeyShareKey {
  public: KeyShareKeyPub // 公開鍵情報
  private: KeyShareKeyPrivate // 秘密鍵情報
  hashHex: string // 鍵のハッシュ
  version: number // 鍵のバージョン
}
```

### keyShareSignKey

keyShareKeyで暗号化されたデータを署名するための鍵。
アルゴリズムはml_dsa65をサポートする。

```ts
interface KeyShareSignKeyPub {
  key: string
  timestamp: string
  sign: Sign
  keyType: "keyShareSignPub" // 鍵の種類
  version: number // 鍵のバージョン
}

interface KeyShareSignKeyPrivate {
  key: string
  keyType: "keyShareSignPrivate" // 鍵の種類
  version: number // 鍵のバージョン
  timestamp: string
}

interface KeyShareSignKey {
  public: KeyShareSignKeyPub
  private: KeyShareSignKeyPrivate
  hashHex: string
  version: number
}

```

### deviceKey

デバイスに保存されるデータを暗号化するための鍵。
```ts

type deviceKey = {
  key: string
  keyType: "deviceKey"
  version: number
}

```

### migrateKey

デバイスの鍵を移行するための鍵。

```ts
interface migrateKeyPub {
  key: string
  keyType: "migratePub"
  version: number
}

interface migrateKeyPrivate {
  key: string
  keyType: "migratePrivate"
  version: number
}

interface migrateKey {
  public: migrateKeyPub
  private: migrateKeyPrivate
  hashHex: string
  version: number
}
```

### migrateDataSignKey

migrateKeyで暗号化されたデータを署名するための鍵。

```ts
interface migrateDataSignKeyPub {
  key: string
  keyType: "migrateDataSignPub"
  version: number
}

interface migrateDataSignKeyPrivate {
  key: string
  keyType: "migrateDataSignPrivate"
  version: number
}

interface migrateDataSignKey {
  public: migrateDataSignKeyPub
  private: migrateDataSignKeyPrivate
  hashHex: string
  version: number
}
```

## 暗号化されたデータなど


- Sign

```typescript
type Sign = {
  signature: string
  hashedPublicKeyHex: string
  version: number
}
```

- EncryptedData

```ts

interface EncryptedDataAccountKey {
  encryptedData: string
  keyType: "accountKey" // 使用された鍵の種類
  //暗号化した鍵のハッシュ値
  cipherText: string //共有秘密を生み出すための暗号文
  encryptedKeyHashHex: string
  version: number
}

interface EncryptedDataRoomKey {
  encryptedData: string
  keyType: "roomKey"
  iv: string
  encryptedKeyHashHex: string
  version: number
}

interface EncryptedDataDeviceKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "DeviceKey" // 使用された鍵の種類
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  version: number
  vi: string
}

interface EncryptedAndSignDataKeyShareKey {
  encryptedData: string // 暗号化されたデータの値
  keyType: "keyShareKey" // 使用された鍵の種類
  encryptedDataSign: Sign //暗号化されたデータに対する署名
  encryptedKeyHashHex: string //暗号化した鍵のハッシュ値
  signKeyHashHex: string //署名した鍵のハッシュ値
  version: number
  cipherText: string //共有秘密を生み出すための暗号文
}

interface Message {
  encrypted: false
  value: {
    message: string
    type: "text" | "image" | "video" | "audio" | "file" | "samnail"
    version: number
    channel: string
    replyTo?: string
    origin?: string
  }
  signature: Sign
  timestamp: string
  bigMessage?: boolean
}
type EncryptedMessage = {
  encrypted: true
  value: EncryptedDataRoomKey
  timestamp: string
  signature: Sign
  bigMessage?: boolean
}
// 暗号化されたメッセージの型

type EncryptedMessageValue = {
    message: string
    type: "text" | "image" | "video" | "audio" | "file" | "samnail"
    version: number
    channel: string
    replyTo?: string
    origin?: string
}

type ServerMessage = {
  timestamp: string
  messageid: string
  channel: string
  message: Message | EncryptedMessage
}
```