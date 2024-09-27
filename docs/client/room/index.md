---
prev:
    text: "register"
    link: "/client/sessions/register"
next:
    text: "create"
    link: "/client/room/create"
---

# roomのapi

## roomとは

個人チャットを拡張して、複数人でのチャットを実現するための機能です。

## roomの構造

roomは以下のような構造を持っています。

```json
{
    "roomid": string,
    "roomName": string,
    "owner": string,
    "members": [
        string
    ],
    "lastMessage": string,
    "room_keys": {
        [user_id: string]: [string] //{ "key": uuid,"timestamp": string } を暗号化したもの
    }
}
```

### roomのメッセージの構造

roomkeyとaccountkeyを使って暗号化されたメッセージ

```json
{
    "timestamp": string,
    "message": [
        {
        member: string,
        message: string /* room_keyによって暗号化*/
        }
    ],
    "serverMessageId": string,
}
```

messageの中身

```json
{
   "messageid": string,
   "message": string,
   "timestamp": string,
}
```
