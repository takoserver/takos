# takos protocolのメッセージ暗号化

ML-KEMとML-DSAはpqc対応の標準化された暗号化方式です。

## 鍵の種類

- **masterKey**:
  - **アルゴリズム**: ML-DSA-87
  - **役割**: 鍵の信頼の根幹となる鍵である。
- **identityKey**:
  - **アルゴリズム**: ML-DSA-65
  - **役割**: メッセージやroomKeyのメタ情報を署名するために利用する。
- **accountKey**:
  - **アルゴリズム**: ML-KEM-768
  - **役割**: roomKeyを暗号化して送信するための鍵。
- **roomKey**:
  - **アルゴリズム**: AES-256
  - **役割**:
    メッセージを暗号化するための鍵。暗号化に利用したaccountKeyのtimestamp、masterKeyのhashなどを含んだメタデータも同時に生成する。(後記述)
- **shareKey**:
  - **アルゴリズム**: ML-KEM-768
  - **役割**: accountKeyを他のセッションに共有するための鍵。
- **shareSignKey**:
  - **アルゴリズム**: ML-DSA-65
  - **役割**: shareKeyで暗号化されたデータを署名するための鍵。
- **migrateKey**:
  - **アルゴリズム**: ML-KEM-1024
  - **役割**: デバイスの鍵を移行するための鍵。
- **migrateSignkey**:
  - **アルゴリズム**: ML-DSA-87
  - **役割**: migrateKeyで暗号化されたデータを署名するための鍵。

### 鍵の形式

以下のobjectをstringにしたものです。

- **masterKey**:

```ts
interface masterKey {
  keyType: "masterKeyPublic" | "masterKeyPrivate";
  key: string;
}
```

公開鍵の文字数: 2723 秘密鍵の文字数: 5496

- **identityKey**:

```ts
interface identityKey {
  keyType: "identityKeyPublic" | "identityKeyPrivate";
  key: string;
  timestamp: number;
  sessionUuid: string;
}
```

公開鍵の文字数: 3494 秘密鍵の文字数: 6567

- **accountKey**:

```ts
interface accountKey {
  keyType: "accountKeyPublic" | "accountKeyPrivate";
  key: string;
  timestamp: number;
}
```

公開鍵の文字数: 1645 秘密鍵の文字数: 3266

- **roomKey**:

```ts
interface roomKey {
  keyType: "roomKey";
  key: string;
  timestamp: number;
  sessionUuid: string;
}
```

鍵の文字数: 153

- **shareKey**:

```ts
interface shareKey {
  keyType: "shareKeyPublic" | "sharekeyPrivate";
  key: string;
  timestamp: number;
  sessionUuid: string;
}
```

公開鍵の文字数: 1696 秘密鍵の文字数: 3317

- **migrateKey**:
  `<"migrateKeyPublic" | "migrateKeyPrivate">-<TIMESTAMP>-<BINARY_KEY>`

```ts
interface migrateKey {
  keyType: "migrateKeyPublic" | "migrateKeyPrivate";
  key: string;
  timestamp: number;
}
```

公開鍵の文字数: 1619 秘密鍵の文字数: 3240

- **migrateSignKey**:
  `<"migrateSignKeyPublic" | "migrateSignKeyPrivate">-<TIMESTAMP>-<BINARY_KEY>`

```ts
interface migrateSignKey {
  keyType: "migrateSignKeyPublic" | "migrateSignKeyPrivate";
  key: string;
  timestamp: number;
}
```

公開鍵の文字数: 2647 秘密鍵の文字数: 5420

keyTypeは上記の鍵の種類を指します。 timestampは鍵の生成時刻を指します。
binaryKeyはbase64でエンコードされた鍵を指します。
sessionUUIDはセッションを識別するためのuuidを指します。
roomIdはroomKeyを識別するためのuuidを指します。

## その他の数値の定義

sessionUUID: uuid
v7。セッションを識別するためのuuid。identityKeyやroomKey、shareKey、shareSignKeyに含まれる

## roomKeyのメタデータ

このような形式のjsonをstringにしたものです。

```ts
interface roomKeyMetaData {
  roomKeyHash: string;
  sharedUser: {
    userId: string; //<userId>
    masterKeyHash: string; // <sha256 encoded by base64>
    accountKeyTimeStamp: number; // <timestamp>
  }[];
}
```

identityKeyで署名します。

## 暗号の形式

```ts
export interface EncryptedData {
  keyType: string;
  keyHash: string;
  binaryEncryptedData: string;
  vi: string;
  cipherText?: string;
}
```

暗号化された鍵

- accountKey: 3806
- roomKey:

keyTypeは上記の鍵の種類を指します。
keyHashはbase64でエンコードされたsha256のハッシュ値を指します。
binaryEncryptedDataは暗号化されたデータをbase64でエンコードしたものを指します。

## 署名の形式

```ts
export interface Sign {
  keyHash: string;
  signature: string;
  keyType: string;
}
```

署名のサイズ

- masterKey: 6267
- identityKey: 4509

keyTypeは上記の鍵の種類を指します。
keyHashはbase64でエンコードされたsha256のハッシュ値を指します。
binarySignatureは署名されたデータをbase64でエンコードしたものを指します。

## メッセージの形式

このような形式のjsonをstringにしたものです。

```ts
// ユーザー識別子（必要に応じて詳細な型定義に変更可能）
export type UserIdentifier = string;

// 返信情報の構造（返信先のメッセージIDなどを含む）
export interface ReplyInfo {
  id: string; // 返信対象のメッセージID
  // 今後、引用テキストなど追加情報を含めることも可能
}

// 非暗号化メッセージの構造
export interface NotEncryptMessage {
  encrypted: false;
  value: {
    type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
    content: string; // 各タイプに応じたJSON文字列（下記参照）
    reply?: ReplyInfo; // 返信先情報（該当する場合のみ）
    mention: UserIdentifier[]; // メンション対象ユーザーの識別子リスト
  };
  channel: string;
  /**
   * isLargeがtrueの場合、またはサムネイルの場合に元のコンテンツへの参照として利用。
   */
  original?: string;
  timestamp: number;
  isLarge: boolean; // コンテンツサイズが256KB以上の場合true
}

// 暗号化メッセージの構造
export interface EncryptedMessage {
  encrypted: true;
  value: string; // 暗号化されたデータ（例：暗号化済みデータやルームキー）
  channel: string;
  /**
   * サムネイルメッセージや大容量メッセージの場合、元のコンテンツへの参照として指定。
   */
  original?: string;
  timestamp: number;
  isLarge: boolean; // コンテンツサイズが256KB以上の場合true
}

// メッセージ全体の型（非暗号化・暗号化のどちらか）
export type Message = NotEncryptMessage | EncryptedMessage;

// 各コンテンツタイプの詳細な形式

// 1. textタイプのコンテンツ
export interface TextContent {
  text: string;                 // テキスト本文
  format?: "plain" | "markdown"; // テキスト形式（未指定の場合はplainを想定）
}

// 2. imageタイプのコンテンツ
export interface ImageContent {
  uri: string;                  // 画像のURI（Base64データURIまたはURL）
  metadata: {
    filename: string;           // ファイル名
    mimeType: string;           // MIMEタイプ（例: image/jpeg, image/png）
  };
}

// 3. videoタイプのコンテンツ
export interface VideoContent {
  uri: string;                  // 動画のURI（Base64データURIまたはURL）
  metadata: {
    filename: string;           // ファイル名
    mimeType: string;           // MIMEタイプ（例: video/mp4）
  };
}

// 4. audioタイプのコンテンツ
export interface AudioContent {
  uri: string;                  // 音声のURI（Base64データURIまたはURL）
  metadata: {
    filename: string;           // ファイル名
    mimeType: string;           // MIMEタイプ（例: audio/mp3, audio/wav）
  };
}

// 5. fileタイプのコンテンツ
export interface FileContent {
  uri: string;                  // ファイルのURI（Base64データURIまたはURL）
  metadata: {
    filename: string;           // ファイル名
    mimeType: string;           // MIMEタイプ
  };
}

// 6. thumbnailタイプのコンテンツ
interface TextThumbnail {
    originalType: "text";
    thumbnailText: string;
    size:? number;
}

// 画像・動画用のサムネイル
interface MediaThumbnail {
    originalType: "image" | "video";
    thumbnailUri: string;       // 実際の画像/動画サムネイル
    thumbnailMimeType: string;
    size:? number;
}

interface FilesThumbnail {
    originalType: "file" | "audio";
    thumbnailText: string;
    size:? number;
}

export type ThumbnailContent = TextThumbnail | MediaThumbnail | FilesThumbnail;

// メッセージのコンテンツタイプ
export type MessageContent = TextContent | ImageContent | VideoContent | AudioContent | FileContent | ThumbnailContent;
```

## roomKeyの共有

roomKeyは共有するユーザーのaccountKeyで暗号化して送信します。
accountKeyのtimestampを確認して鍵の有効性を確認します。

## メッセージの暗号化

メッセージはroomKeyで暗号化されます。

受信者は自身のaccountKeyでroomKeyを復号し、roomKeyでメッセージを復号します。

## accountKeyの共有

shareKeyで暗号化し、shareSignKeyで署名して各デバイスに共有します。

## 鍵の更新

identityKey、accountKey、roomKeyは定期的に更新します。更新時には新しい鍵を生成する。

共有の方法は生成と同様です。

## 鍵の信頼性の確保

各鍵はmasterKeyで署名されています。
masterKeyのhashをオフラインで確認したり、信頼できる方法でmasterKeyが正しいことを確認します。

### 新規デバイスの追加

新規デバイスの追加時には、migrateKeyでデバイスの鍵を暗号化してmigrateSignKeyで署名し、各デバイスで鍵のハッシュを確認して送信&追加します。

### トークルームにおける鍵の規則

同じsessionUUIDのroomKeyは連続してのみ利用可能です。
同じsessionUUIDのidentityKeyは連続してのみ利用可能です。
サーバー側のtimestampとメッセージのtimestampの誤差が1分以上ある場合、メッセージは無効となります。
