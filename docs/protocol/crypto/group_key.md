# Grop鍵

grop鍵はgroupチャットにおける暗号化に使用されます。
基本的にオーナーが更新します
アルゴリズム AES

```json
{
    [
        {
            "userid": string,
            "roomKeyUUID": string,
            "accountKeyUUID": string,
            //暗号化されたgroupkeyをaccount鍵で署名
            "sign": string,
            //暗号化された
            "groupKey": string
        }
    ]
}
```

groupKeyを復号化したもの
```json
{
    "groupKey": string,
    "uuid": string
}
```