# takos protocolのメッセージ暗号化

## 鍵の形式: `<KEY_TYPE>-<TIMESTAMP>-<BINARY_KEY>-<?SESSION-UUID>`

## その他の数値の定義

sessionUUID: uuid v7。セッションを識別するためのuuid。identityKeyやroomKey、shareKey、shareSignKeyに含まれる

## 鍵の種類
- **masterKey**:
  アルゴリズム:ML-DSA-87
  役割: 鍵の信頼の根幹となる鍵である。
- **identityKey**
  アルゴリズム:ML-DSA-65
  役割: メッセージやroomKeyのメタ情報を署名するために利用する
- **accountKey**
  アルゴリズム: ML-KEM-1024
  役割: roomKeyを暗号化して送信するための鍵
- **roomKey**
  アルゴリズム: AES-256
  役割: メッセージを暗号化するための鍵。暗号化に利用したaccountKeyのtimestamp、masterKeyのhashなどを含んだメタデータも同時に生成する。(後記述)
- **shareKey**
  アルゴリズム: ML-KEM-768
  役割: accountKeyを他のセッション
- **shareSignKey**
  アルゴリズム: ML-DSA-65
  役割: shareKeyで暗号化したものを署名する鍵

## roomKeyのメタデータ

このような形式である。

```ts
type roomKeyMetaData = {
  userid: string //<userId>
  masterKeyHash: string // <sha256 encoded by base64>
  accountKeyTimeStamp: number // new Date().getTime()
}[]
```

stringの形式にして、identityKeyで署名します。
