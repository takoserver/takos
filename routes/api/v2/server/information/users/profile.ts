//ユーザーのプロフィールを取得
//POST /api/v2/server/information/users/profile
// { host: string, body: string, signature: string}
// signatureは秘密鍵で署名されたJSON
// body: { userid: string, friendid: string }
// -> { status: boolean, profile: { name: string,} }
import users from "../../../../../../models/users.ts"
import friends from "../../../../../../models/friends.ts"
import takos from "../../../../../../util/takos.ts"
export const handler = {
  async POST(req: any, ctx: any) {
    const body = await req.json()
    const host = body.host
    const publickey = await fetch(`https://${host}/api/v2/server/pubkey`).then((res) => res.json()).then((data) => data.publickey)
    const verify = await takos.verifySignature(publickey, body.signature, body.body)
    if (!verify) {
      return ctx.json({ status: false })
    }
    const data = JSON.parse(body.body)
    const friend = await users.findOne({ uuid: data.friendid })
    if (friend === null) {
      return ctx.json({ status: false })
    }
    const FriendFriendData = await friends.findOne({ user: data.friendid })
    if (FriendFriendData === null) {
      return ctx.json({ status: false })
    }
    const isFriend = FriendFriendData.friends.find((friend: any) => friend.userid === data.userid)
    if (isFriend === undefined) {
      return ctx.json({ status: false })
    }
    return new Response(JSON.stringify({
      status: true,
      body: JSON.stringify({
        userName: friend.userName,
        nickName: friend.nickName,
      }),
      signature: await takos.signData(
        JSON.stringify({
          userName: friend.userName,
          nickName: friend.nickName,
        }),
        await takos.getPrivateKey(),
      ),
    }))
  },
}
