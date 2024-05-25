import rooms from "../../../../models/rooms.ts"
import user from "../../../../models/users.ts"
export const handler = {
  async GET(req: Request, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return new Response(JSON.stringify({ "status": "Please Login" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      })
    }
    const requrl = new URL(req.url)
    const roomid = requrl.searchParams.get("roomid")
    if (!roomid) {
      return new Response(JSON.stringify({ "status": "Room ID Not Found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      })
    }
    const startChat = requrl.searchParams.get("startChat") === "true"
    //Start Chatがtrueの場合、roomidの部屋から最新のメッセージを100件取得
    if (startChat) {
      const room = await rooms.findOne({
        name: roomid,
      })
      if (!room) {
        return new Response(JSON.stringify({ "status": "Room Not Found" }), {
          headers: { "Content-Type": "application/json" },
          status: 404,
        })
      }
      let RoomName = ""
      if (room.types === "friend") {
        // ctx.state.data.userid.toString()以外のroom.usersの配列に存在するユーザーのIDを取得
        const friendId = room.users.filter((id: string) =>
          id !== ctx.state.data.userid.toString()
        )
        // friendIdのユーザー情報を取得
        const friend = await user.findOne({
          _id: friendId[0],
        })
        if (!friend) {
          return new Response(
            JSON.stringify({ "status": "Friend Not Found" }),
            {
              headers: { "Content-Type": "application/json" },
              status: 404,
            },
          )
        }
        // friendのuserNameを取得
        RoomName = friend.nickName
      } else {
        RoomName = room.showName || ""
      }
      let senderCache: {
        [index: string]: { sendername: string; senderid: string }
      } = {}
      const result = {
        roomname: RoomName,
        messages: await Promise.all(
          room.messages.slice(-100).map(async (message: any) => {
            if (!senderCache[message.sender]) {
              const preSenderName = await user.findOne({
                _id: message.sender,
              })
              if (!preSenderName) {
                senderCache[message.sender] = {
                  sendername: "Unknown",
                  senderid: message.sender,
                }
              } else {
                senderCache[message.sender] = {
                  sendername: preSenderName.userName,
                  senderid: message.sender,
                }
              }
            }
            return {
              sender: senderCache[message.sender].sendername,
              message: message.message,
              timestamp: message.timestamp,
            }
          }),
        ),
      }
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }
    //Start Chatがfalseの場合、roomidの部屋から一定の時間以降のメッセージを30件取得
    const when = requrl.searchParams.get("when")
    if (!when) {
      return new Response(JSON.stringify({ "status": "When Not Found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      })
    }
    const room = await rooms.findOne({
      name: roomid,
      messages: { $elemMatch: { timestamp: { $gte: new Date(when) } } },
    })
    if (!room) {
      return new Response(JSON.stringify({ "status": "Room Not Found" }), {
        headers: { "Content-Type": "application/json" },
        status: 404,
      })
    }
    interface SenderCache {
      [index: string]: {
        sendername: string
        senderid: string
      }
    }
    // deno-lint-ignore prefer-const
    let senderCache: SenderCache = {}
    const messages = room.messages.map(async (message: any) => {
      //senderCacheオブジェクトにsenderidが存在しない場合、usersコレクションからsenderidに対応するsendernameを取得
      if (!senderCache[message.sender]) {
        const sender = await user.findOne({
          addFriendKey: message.sender,
        })
        if (sender) {
          senderCache[message.sender] = {
            sendername: sender.userName,
            senderid: message.sender,
          }
        } else {
          senderCache[message.sender] = {
            sendername: "Unknown",
            senderid: message.sender,
          }
        }
      }
      return {
        sender: senderCache.sendername,
        message: message.message,
        timestamp: message.timestamp,
      }
    })
    return new Response(JSON.stringify(messages), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  },
}