# room_keyの仕様

## room_keyとは

room_keyは、チャットルームに参加する各アカウントが秘密鍵と共通鍵を持つ暗号化システムです。この仕組みにより、チャットルーム内のメッセージを暗号化して送受信できます。groupではroom_keyを使用してgroup_keyを配布して通信する。
アルゴリズム: rsa-oaep

##　room_keyの構造

```json
{
    "roomKeyPubPem": "string",
    "accountKeyUUID": "",
    "sign": "",
    "uuid": "uuid v7",
    "uuidSign": ""
}
```

roomKeyPubPem roomKeyをpem形式にしたもの
accountKeyUUID 署名したaccountkeyのuuid
sign accountKeyの署名
uuid room_keyのuuid
uuidSign roomKeyPubPemとuuidをaccountKeyで署名したもの