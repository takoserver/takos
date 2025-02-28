# groupの仕様

groupにはこのような概念があります。

- channel
- category
- member
- role

## channel

channelはgroup内のチャンネルです。
すべてのメッセージはchannelに送信されます。
channelはcategoryに属したり属さなかったりします。
デフォルトの権限では、channelやcategoryにおいて送信する権限がありません。

次のような形式で表すことができます。

channel
```ts
{
    name: string
    id: string,
    category: string,
    permission: {
        roleId: string,
        permission: string[]
    }[]
}
```

## category

categoryはchannelをまとめるためのものです。
categoryにも権限を設定することができ、channelに権限を継承させることができます。

次のような形式で表すことができます。

category
```ts
{
    name: string,
    id: string,
    permission: {
        roleId: string,
        permission: string[]
    }[]
}
```

## member

memberはgroupに参加しているユーザーです。
memberにはroleが設定されており、roleによって権限が与えられます。

次のような形式で表すことができます。

member
```ts
{
    userId: string,
}
```

## role

roleはmemberに権限を与えるためのものです。
roleにはpermissionが設定されており、permissionによって権限が与えられます。

次のような形式で表すことができます。

role
```ts
{
    name: string,
    id: string,
    permission: {
        roleId: string,
        permission: string[]
    }[]
}
```

## userのロール

userのroleは次のように設定されます。

```ts
{
    userId: string,
    roleId: string
}
```

## groupへの参加

メンバーの参加は

t.group.invite.accept
t.friend.group.accept
t.group.join
でのみ発生する

非ホストサーバーはmemberを自ら追加し、
hostサーバーは新規に追加されたサーバー以外のサーバーに
t.group.sync.member.addを送信する

### t.group.invite.accept

privateGroupにおいて、招待されたユーザーが参加を承認するためのイベントです。

### t.friend.group.accept

publicGroupにおいて、ユーザーの参加が承認されたことを通知するためのイベントです。

### t.group.join

publicGroupにおいて、ユーザーが参加するためのイベントです。

## groupからの退出

メンバーの退出は

### t.group.leave

groupから退出するためのイベントです。

このeventを利用した場合、t.group.sync.member.removeは利用したユーザーのサーバーには送信されません。

### t.group.kick & t.group.ban

groupから強制的に退出させるためのイベントです。

