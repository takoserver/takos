# account_key

account_keyは、ユーザーのアカウント同士の信頼関係を確立します。
account_keyは各鍵の信頼を保証する鍵です。
アカウント作成時またはセットアップ時に、クライアントで鍵ペアを生成し、公開鍵をアップロードします。
account_keyの信用の構築は、以下の手段があります。

- 実際にあってハッシュ値を検証する
- 信頼できる人から検証する
- 信頼できるメッセージングアプリ（例: Signal, WhatsApp）を使用して検証する

### アルゴリズム

RSA-PSS

### account鍵のuuid

account鍵にはそれぞれにuuid v7が割り振られています。
それぞれのuuidにはpemに変換された公開鍵とuuidを組み合わせたものをaccount鍵で署名したものがあります。
鍵の構造

初回はsignは不要

```ts
{
  accountKeyPubPem: --pemkey--,
  uuid: --uuid v7--,
  uuidSign: --signnature--,
  sign?: --accountKeyPubPemを一つ前の鍵で署名したもの--,
}
```

### 鍵の更新

次のjsonを各サーバーのエンドポイントに送信

```json
{
  "accountKeyPubPem": "",
  "uuid": "",
  "uuidSgin": "",
  "sign": ""
}
```

### 鍵の再発行

次のjsonを各サーバーのエンドポイントに送信

```json
{
  "accountKeyPubPem": "",
  "uuid": "",
  "uuidSgin": ""
}
```
