# room_keyの仕様

## room_keyとは

room_keyは、チャットルームに参加する各アカウントが秘密鍵と共通鍵を持つ暗号化システムです。この仕組みにより、チャットルーム内のメッセージを暗号化して送受信できます。

room_keyの信用はaccount_keyに依存する

## room_keyの構造

rsassa-pkcs1-v1_5を使用して、鍵ペアを生成し、accountKeyで署名し次のようなオブジェクトをサーバーにアップロードします。

```ts
{
    key: {
        publicKey: string,
        roomId: string,
        timestamp: string
    }
    signature: string
}
```

## room_keyの更新

最新のaccount_keyで署名しサーバーにアップロードする。
room_keyは頻繁に更新する必要がある。

# takos-web Endpoint `POST /takos/client/crypto/roomkey/`

| 名前      | 型     | 説明                        | 必須 |
| --------- | ------ | --------------------------- | ---- |
| room_key  | string | ルーム鍵(公開)              | true |
| room_id   | string | ルームid                    | true |
| signature | string | account_keyでroom_keyを署名 | true |
| csrftoken | string | CSRFトークン                | true |
