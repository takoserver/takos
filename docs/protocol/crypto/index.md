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
- messageKey
- migrateSignKey

masterKeyを含め後程詳しく説明します。

基本的なデータ型

- Sign

```typescript
type Sign = {
  signature: string // 署名をbase64エンコードしたもの
  hashedPublicKeyHex: string // 署名に利用した鍵の公開鍵をハッシュ化し、16進数文字列に変換したもの
  type: "master" | "identity"
  version: number // 署名のバージョン
}
```
