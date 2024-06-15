import redis from "redis"
import rooms from "../../../../models/rooms.ts"
import messages from "../../../../models/messages.ts"
import user from "../../../../models/users.ts"
import takostoken from "../../../../models/takostoken.ts"
import { load } from "$std/dotenv/mod.ts"
const env = await load()
const redisURL = env["REDIS_URL"]
const pubClient = redis.createClient({
    url: redisURL,
})
await pubClient.connect()
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
            return new Response(
                JSON.stringify({ "status": "Room ID Not Found" }),
                {
                    headers: { "Content-Type": "application/json" },
                    status: 404,
                },
            )
        }
        //ユーザーがroomidの部屋に参加しているか確認
        const room = await rooms.findOne({
            uuid: roomid,
            users: { $elemMatch: { userid: ctx.state.data.userid } },
        })
        if (!room) {
            return new Response(
                JSON.stringify({ "status": "Room Not Found" }),
                {
                    headers: { "Content-Type": "application/json" },
                    status: 404,
                },
            )
        }
        const startChat = requrl.searchParams.get("startChat") === "true"
        //Start Chatがtrueの場合、roomidの部屋から最新のメッセージを100件取得
        if (startChat) {
            const room = await rooms.findOne({
                uuid: roomid,
            })
            if (!room) {
                return new Response(
                    JSON.stringify({ "status": "Room Not Found" }),
                    {
                        headers: { "Content-Type": "application/json" },
                        status: 404,
                    },
                )
            }
            //最近送信されたメッセージを100件取得してreadにuseridを追加
            const RoomMessages = await messages.find({
                roomid: roomid,
            }).sort({ timestamp: -1 }).limit(100)
            await messages.updateMany(
                {
                    roomid: roomid,
                    read: {
                        $not: { $elemMatch: { userid: ctx.state.data.userid } },
                    },
                },
                {
                    $push: {
                        read: {
                            userid: ctx.state.data.userid,
                            readAt: new Date(),
                        },
                    },
                },
            )
            if (!RoomMessages) {
                return new Response(
                    JSON.stringify({ "status": "Message Not Found" }),
                    {
                        headers: { "Content-Type": "application/json" },
                        status: 404,
                    },
                )
            }
            let RoomName = ""
            let messagesResult
            if (room.types === "friend") {
                // ctx.state.data.userid.toString()以外のroom.usersの配列に存在するユーザーのIDを取得
                const friendId = room.users
                    .filter((user: any) =>
                        user.userid !== ctx.state.data.userid
                    )
                    .map((user: any) => user.userid)
                // friendIdのユーザー情報を取得
                const friend = await user.findOne({
                    uuid: friendId[0],
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
                messagesResult = await Promise.all(
                    RoomMessages.map(async (message) => {
                        //console.log(message.userid)
                        const sender = await user.findOne({ uuid: message.userid })
                        if (!sender) {
                            return {
                                sender: "Unknown",
                                senderNickName: "Unknown",
                                message: message.message,
                                timestamp: message.timestamp,
                            }
                        }
                        return {
                            sender: sender.userName + "@" + env["serverDomain"],
                            senderNickName: sender.nickName,
                            message: message.message,
                            timestamp: message.timestamp,
                        }
                    }),
                )
            } else if (room.types === "remotefriend") {
                const friendId = room.users
                    .filter((user: any) =>
                        user.userid !== ctx.state.data.userid
                    )
                    .map((user: any) => user.userid)
                const takosTokenArray = new Uint8Array(16)
                const randomarray = crypto.getRandomValues(takosTokenArray)
                const takosToken = Array.from(
                    randomarray,
                    (byte) => byte.toString(16).padStart(2, "0"),
                ).join("")
                await takostoken.create({
                    token: takosToken,
                    userid: ctx.state.data.userid,
                })
                const OtherServerUser = splitUserName(friendId[0])
                const OtherServerUserDomain = OtherServerUser.domain
                console.log(friendId[0])
                const OtherServerUserInfo = await fetch(
                    `http://${OtherServerUserDomain}/api/v1/server/friends/${friendId[0]}/profile?token=${takosToken}&serverDomain=${
                        env["serverDomain"]
                    }&type=id&reqUser=${ctx.state.data.userid}`,
                )
                if (!OtherServerUserInfo) {
                    return new Response(
                        JSON.stringify({ "status": "Friend Not Found" }),
                        {
                            headers: { "Content-Type": "application/json" },
                            status: 404,
                        },
                    )
                }
                const OtherServerUserInfoJson = await OtherServerUserInfo.json()
                if(OtherServerUserInfoJson.status === false || !OtherServerUserInfoJson){
                    console.log(JSON.stringify(OtherServerUserInfoJson) + " is not found")
                    return new Response(
                        JSON.stringify({ "status": "Friend Not Found" }),
                        {
                            headers: { "Content-Type": "application/json" },
                            status: 404,
                        },
                    )
                }
                RoomName = OtherServerUserInfoJson.result.nickName
                const userName = await user.findOne({ uuid: ctx.state.data.userid })
                if(!userName){
                    return new Response(
                        JSON.stringify({ "status": "User Not Found" }),
                        {
                            headers: { "Content-Type": "application/json" },
                            status: 404,
                        },
                    )
                }
                messagesResult = await Promise.all(
                    RoomMessages.map((message) => {
                        let sender
                        if (message.userid === ctx.state.data.userid) {
                            sender = {
                                userName: userName.userName,
                                nickName: userName.nickName,
                            }
                        } else {
                            sender = OtherServerUserInfoJson.result
                        }
                        if (!sender) {
                            return {
                                sender: "Unknown",
                                senderNickName: "Unknown",
                                message: message.message,
                                timestamp: message.timestamp,
                            }
                        }
                        return {
                            sender: sender.userName + "@" + env["serverDomain"],
                            senderNickName: sender.nickName,
                            message: message.message,
                            timestamp: message.timestamp,
                        }
                    }),
                )
            } else {
                return
            }
            const result = {
                roomname: RoomName,
                messages: messagesResult,
            }
            return new Response(JSON.stringify(result), {
                headers: { "Content-Type": "application/json" },
            })
        }
    },
}
function splitUserName(userName) {
    const split = userName.split("@")
    return {
        userName: split[0],
        domain: split[1],
    }
}
