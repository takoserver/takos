# Device Key

## 概要

デバイスの紛失による鍵の盗難を防ぐために、デバイスの鍵を暗号化して保存する。
秘密鍵を保持しないことで、デバイスの紛失による鍵の盗難を防ぐ。
この機能を利用するかどうかは、ユーザーが選択できるようにする。
秘密鍵のみをアップロードすることで、サーバーによる改ざんを防ぐ。

## init

### Endpoint `POST /takos/client/sessions/login`

[login api docs](/client/sessions/login)

## get private

### Endpoint `GET /takos/client/crypto/devicekey/`

### Response

```json
{
  "device_key": "string"
}
```
