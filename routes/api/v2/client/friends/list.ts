//友達の情報のオブジェクトを配列で返す
//GET /api/v2/client/friends/list
// -> { status: boolean, message: string, friends: [{userName, nickName,latestMessage,latestMessageTime}] }
import users from "../../../../../models/users.ts"
import rooms from "../../../../../models/rooms.ts"
import messages from "../../../../../models/messages.ts"
import { load } from "$std/dotenv/mod.ts"
import takos from "../../../../../util/takos.ts"
const env = await load()
export const handler = {
  async GET(req: any, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return ctx.json({ status: false, message: "You are not logged in" })
    }
    const userid = ctx.state.data.userid
    const roomsData = await rooms.find({ "users.userid": userid })
    const result = await Promise.all(roomsData.map(
      async (room: any) => {
        switch (room.types) {
          case "friend":
            return await getFriendData(room, ctx)
          case "remotefriend":
            return await getRemoteFriendData(room, ctx)
          case "community":
            break
          case "group":
            break
        }
      },
    ))
    return new Response(
      JSON.stringify({
        status: true,
        friends: result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  },
}
async function getFriendData(room: any, ctx: any) {
  const friendID = room.users.filter(
    (user: { userid: string }) => user.userid !== ctx.state.data.userid,
  )
  const uuid: string = friendID[0].userid
  const friendName = await users.findOne({
    uuid: uuid,
  })
  const latestmessage = await messages.findOne({
    roomid: room.uuid,
  }).sort({ timestamp: -1 })
  const isNewMessage = latestmessage?.read.find(
    (read: any) => read.userid === ctx.state.data.userid || latestmessage.userid == ctx.state.data.userid,
  )
  const friendResult = {
    roomName: friendName?.nickName,
    lastMessage: latestmessage?.message,
    roomID: room.uuid,
    latestMessageTime: latestmessage?.timestamp,
    roomIcon: `/api/v2/client/friends/info/${uuid}/icon/friend`,
    type: "localfriend",
    isNewMessage: isNewMessage === undefined,
  }
  return friendResult
}
async function getCachedRemoteFriendData(room: any, ctx: any) {
}
async function getRemoteFriendData(room: any, ctx: any) {
  const friendID = room.users.filter(
    (user: { userid: string }) => user.userid !== ctx.state.data.userid,
  )
  const requestFriendNameBody = {
    userid: ctx.state.data.userid,
    friendid: friendID[0].userid,
  }
  const friendName = await fetch(`https://${takos.splitUserName(friendID).domain}/api/v2/server/information/users/profile`, {
    method: "POST",
    body: JSON.stringify({
      host: env["DOMAIN"],
      body: JSON.stringify(requestFriendNameBody),
      signature: takos.signData(JSON.stringify(requestFriendNameBody), await takos.getPrivateKey()),
    }),
  })
  const pubkey = await fetch(`https://${takos.splitUserName(friendID).domain}/api/v2/server/pubkey`).then((res) => res.json()).then((data) => data.publickey)
  const friendNameData = await friendName.json()
  const verify = await takos.verifySignature(pubkey, friendNameData.signature, friendNameData.body)
  if (!verify) {
    return ctx.json({ status: false, message: "Signature verification failed" })
  }
  const latestmessage = await messages.findOne({
    roomid: room.uuid,
  }).sort({ timestamp: -1 })
  const isNewMessage = latestmessage?.read.find(
    (read: any) => read.userid === ctx.state.data.userid || latestmessage.userid == ctx.state.data.userid,
  )
  const friendResult = {
    roomName: friendNameData.userName,
    lastMessage: latestmessage?.message,
    roomID: room.uuid,
    latestMessageTime: latestmessage?.timestamp,
    roomIcon: `https://${takos.splitUserName(friendID).domain}/api/v2/server/information/users/icon`,
    type: "remotefriend",
    isNewMessage: isNewMessage === undefined,
  }
  return friendResult
}
