# room_keyの仕様

## room_keyとは

room_keyは、チャットルームに参加する各アカウントが秘密鍵と共通鍵を持つ暗号化システムです。この仕組みにより、チャットルーム内のメッセージを暗号化して送受信できます。

## room_keyの構造

rsassa-pkcs1-v1_5を使用して、鍵ペアを生成し、accountKeyで署名し次のようなオブジェクトをサーバーにアップロードします。

```ts
{
    key: {
        publicKey: string,
        timestamp: string
    }
    signature: string
}
```