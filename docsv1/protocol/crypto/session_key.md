# session鍵

### session鍵の概要

session鍵とはaccount鍵の更新のために使用する暗号化用の鍵です。
鍵のアルゴリズムは rsa-oaep

### 鍵のuuid

鍵のuuidはaccount鍵と同様にuuid v7で生成します。
session鍵の公開鍵のpemとuuidを組み合わせてたものを現在のaccount鍵で署名します。

### 鍵の更新

session鍵はアカウント鍵が更新されると新しいaccount鍵で署名したsession鍵を生成しサーバーにアップロードします。
署名するアカウント鍵は最新の鍵だけではなく有効な鍵ならばどれでも可
※できるだけ最新の鍵を使用することを推奨

### 鍵の構造

```json
{
  "sessionKeyPubPem": "--pem--",
  "uuid": "--uuid v7--",
  "uuidSign": "",
  "accountKeyUUID": ""
}
```

### 暗号化したaccount鍵をサーバーに送信。

暗号化したアカウント鍵の秘密鍵を一つ前の鍵で署名

```json
{
  "data": "",
  "sessionKeyUUID": "",
  "signNature": ""
}
```
