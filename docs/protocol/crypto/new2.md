# takos protocolのメッセージ暗号化

## 鍵の種類

- **masterKey**: 
  - **アルゴリズム**: ML-DSA-87 
  - **役割**: 鍵の信頼の根幹となる鍵である。
- **identityKey**: 
  - **アルゴリズム**: ML-DSA-65 
  - **役割**: メッセージやroomKeyのメタ情報を署名するために利用する。
- **accountKey**: 
  - **アルゴリズム**: ML-KEM-1024 
  - **役割**: roomKeyを暗号化して送信するための鍵。
- **roomKey**: 
  - **アルゴリズム**: AES-256 
  - **役割**: メッセージを暗号化するための鍵。暗号化に利用したaccountKeyのtimestamp、masterKeyのhashなどを含んだメタデータも同時に生成する。(後記述)
- **shareKey**: 
  - **アルゴリズム**: ML-KEM-768 
  - **役割**: accountKeyを他のセッションに共有するための鍵。
- **shareSignKey**: 
  - **アルゴリズム**: ML-DSA-65 
  - **役割**: shareKeyで暗号化したものを署名する鍵。
- **migrateKey**: 
  - **アルゴリズム**: ML-KEM-1024
  - **役割**: デバイスの鍵を移行するための鍵。
- **migrateSignkey**: ML-DSA-87
  - **アルゴリズム**: ML-DSA-87
  - **役割**: migrateKeyで暗号化されたデータを署名するための鍵。

### 鍵の形式

`<KEY_TYPE>-<TIMESTAMP>-<BINARY_KEY>[-<SESSION_UUID>]`

keyTypeは上記の鍵の種類を指します。
timestampは鍵の生成時刻を指します。
binaryKeyはbase64でエンコードされた鍵を指します。
sessionUUIDはroomKey、identityKey、shareKey、shareSignKeyの場合、含まれます。

## その他の数値の定義

sessionUUID: uuid
v7。セッションを識別するためのuuid。identityKeyやroomKey、shareKey、shareSignKeyに含まれる

## roomKeyのメタデータ

このような形式のjsonをstringにしたものです。

```ts
interface roomKeyMetaData {
  roomKeyHash: string;
  shareedUser: {
    userid: string; //<userId>
    masterKeyHash: string; // <sha256 encoded by base64>
    accountKeyTimeStamp: number; // <timestamp>
  }[];
}
```

identityKeyで署名します。

## 暗号の形式

`<KEY_TYPE>-<KEY_HASH>-<BINARY_ENCRYPTED_DATA>`

keyTypeは上記の鍵の種類を指します。
keyHashはbase64でエンコードされたsha256のハッシュ値を指します。
binaryEncryptedDataは暗号化されたデータをbase64でエンコードしたものを指します。

## 署名の形式

`<KEY_TYPE>-<KEY_HASH>-<BINARY_SIGNATURE>`

keyTypeは上記の鍵の種類を指します。
keyHashはbase64でエンコードされたsha256のハッシュ値を指します。
binarySignatureは署名されたデータをbase64でエンコードしたものを指します。

## メッセージの形式

このような形式のjsonをstringにしたものです。

```ts

export interface NotEncryptMessage {
  encrypted: false;
  value: {
    type: "text" | "image" | "video" | "audio" | "file" | "other";
    content: string;
  };
  channel: string;
  orignal?: string;
  timestamp: string;
  isLarge: boolean;
}

export interface EncryptedMessage {
  encrypted: true;
  value: string;
  channel: string;
  orignal?: string;
  timestamp: string;
  isLarge: boolean;
}

export type Message = NotEncryptMessage | EncryptedMessage;

```

## メッセージの暗号化

メッセージはroomKeyで暗号化されます。roomKeyはidentityKeyで署名されたものを利用します。

## roomKeyの共有

roomKeyは共有するユーザーのaccountKeyで暗号化して送信します。
accountKeyのtimestampを確認して鍵の有効性を確認します。