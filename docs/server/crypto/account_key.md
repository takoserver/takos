# account_keyについて

アカウント作成時またはセットアップ時に、クライアントで鍵ペアを生成し、公開鍵をアップロード

アルゴリズム: RSASSA-PKCS1-v1_5

### 初期設定

takos-webでのEndpoint: `POST /takos/client/sessions/setup`

### 更新

takos-webでのEndpoint: `POST /takos/client/crypto/accountkey/update`

| 名前        | 型     | 説明                            | 必須 |
| ----------- | ------ | ------------------------------- | ---- |
| account_key | string | アカウント鍵                    | true |
| signature   | string | 既存の秘密鍵でaccount_keyを署名 | true |
| csrftoken   | string | CSRFトークン                    | true |

※正常な更新は3か月に一度しかできない 半年に一度の更新を推奨

### 再発行

秘密鍵が漏洩または紛失した場合、再発行が可能
再発行すると、すべてのデバイスのセッションが切断され、アカウントの信頼がリセットされる

takos-webでのEndpoint: `POST /takos/client/crypto/accountkey/reissue`

| 名前        | 型     | 説明         | 必須 |
| ----------- | ------ | ------------ | ---- |
| account_key | string | 公開鍵       | true |
| csrftoken   | string | CSRFトークン | true |

### account_keyの信頼情報をサーバーに保存

takos-webでのEndpoint: `POST /takos/client/crypto/accountkey/trust`

自身のaccount_keyで署名した信頼情報をサーバーに保存

```json
{
  "trust": [
    {
      "user_id": "user_id",
      "account_key": "account_key",
      "trust": true
    }
  ],
  "last_update": "2021-01-01T00:00:00Z"
}
```

↑のjsonを自身のaccount_keyで署名してサーバーにアップロード

| 名前      | 型     | 説明         | 必須 |
| --------- | ------ | ------------ | ---- |
| trust     | string | 信頼情報     | true |
| signature | string | 署名         | true |
| csrftoken | string | CSRFトークン | true |

### account_keyの信頼情報を取得

takos-webでのEndpoint: `GET /takos/client/crypto/accountkey/trust`

サーバーから信頼情報を取得

response:

```json
{
  "trust": [
    {
      "user_id": "user_id",
      "account_key": "account_key",
      "trust": true
    }
  ],
  "last_update": "2021-01-01T00:00:00Z"
}
```
