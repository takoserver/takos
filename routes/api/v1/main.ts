import redis from "redis"
import rooms from "../../../models/rooms.ts"
import users from "../../../models/users.ts"
import { load } from "$std/dotenv/mod.ts"
import { crypto } from "$std/crypto/mod.ts"
import messages from "../../../models/messages.ts"
import takostoken from "../../../models/takostoken.ts"
import pubClient from "../../../util/redisClient.ts"
const env = await load()
const redisURL = env["REDIS_URL"]
const subClient = redis.createClient({
    url: redisURL,
})
subClient.on("error", (err: any) => console.error("Sub Client Error", err))

await subClient.connect()

async function subscribeMessage(channel: string | string[]) {
    await subClient.subscribe(channel, async (message) => {
        const data = JSON.parse(message)
        switch (data.type) {
            case "message":
                sendConecctingUserMessage(
                    data.roomid,
                    data.message,
                    data.sender,
                    data.time,
                    data.messageid,
                    data.messageType,
                )
                break
            case "refreshFriedList":
                break
            case "read":
                readMessage(data.messageids, data.sender)
                break
            default:
                break
        }
    })
}

await subscribeMessage("takos")
const sessions = new Map()

export const handler = {
    async GET(req: Request, ctx: any) {
        if (!ctx.state.data.loggedIn) {
            return new Response(JSON.stringify({ "status": "Please Login" }), {
                headers: { "Content-Type": "application/json" },
                status: 401,
            })
        }
        if (req.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(req)
            socket.onmessage = async function (event) {
                const data = JSON.parse(event.data)
                switch (data.type) {
                    case "joinRoom":
                        joinRoom(data.sessionid, data.roomid, socket)
                        break
                    case "message":
                        sendMessage(
                            data.sessionid,
                            data.message,
                            data.roomid,
                            socket,
                            data.messageType,
                        )
                        break
                    case "login":
                        login(ctx.state.data.userid, socket)
                        break
                    default:
                        break
                }
            }
            socket.onclose = () => {
                console.log("close")
                sessions.forEach((session, key) => {
                    if (session.ws.readyState !== WebSocket.OPEN) {
                        sessions.delete(key)
                    }
                })
            }
            if (!socket) throw new Error("unreachable")
            return response
        } else {
            return new Response(
                JSON.stringify({
                    response: "the request is a normal HTTP request",
                }),
            )
        }
    },
}
async function login(userID: string, ws: WebSocket) {
    const user = await users.findOne({
        uuid: userID,
    })
    if (!user) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "User Not Found",
            }),
        )
        return
    }
    const sessionID = crypto.randomUUID()
    sessions.set(sessionID, {
        ws,
        uuid: userID,
        talkingRoom: "",
        roomType: "",
    })
    ws.send(
        JSON.stringify({
            type: "login",
            status: true,
            sessionID,
        }),
    )
}
async function joinRoom(sessionID: string, roomID: string, ws: WebSocket) {
    if (!sessionID || !roomID) {
        console.log(sessionID, roomID)
        ws.send(
            JSON.stringify({
                status: false,
                explain: "SessionID or RoomID is not found",
            }),
        )
        return
    }
    const session = sessions.get(sessionID)
    if (!session) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "Session Not Found",
            }),
        )
        return
    }
    const room = await rooms.findOne({
        uuid: roomID,
    })
    if (!room) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "Room Not Found",
            }),
        )
        return
    }
    const isRoomUser = room.users.find((user) => user.userid === session.uuid)
    if (!isRoomUser) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "You are not in the room",
            }),
        )
        return
    }
    sessions.set(sessionID, {
        ...session,
        talkingRoom: roomID,
        roomType: room.types,
    })
    ws.send(
        JSON.stringify({
            type: "joinRoom",
            status: true,
            roomID,
            roomType: room.types,
            sender: session.uuid,
        }),
    )
}
async function sendMessage(
    sessionid: string,
    message: string,
    roomID: string,
    ws: WebSocket,
    MessageType: string,
) {
    const session = sessions.get(sessionid)
    if (!session) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "Session Not Found",
            }),
        )
        return
    }
    if (session.talkingRoom !== roomID) {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "You are not in the room",
            }),
        )
        return
    }
    if (session.roomType === "friend") {
        const result = await messages.create({
            userid: session.uuid,
            roomid: roomID,
            message,
            read: [],
            messageType: MessageType,
            messageid: crypto.randomUUID(),
        })
        const time = result.timestamp
        pubClient.publish(
            "takos",
            JSON.stringify({
                roomid: roomID,
                message,
                type: "message",
                sender: session.uuid,
                time,
                messageid: result.messageid,
                messageType: MessageType,
            }),
        )
        ws.send(
            JSON.stringify({
                status: true,
            }),
        )
    } else if (session.roomType === "remotefriend") {
        const takosTokenArray = new Uint8Array(16)
        const randomarray = crypto.getRandomValues(takosTokenArray)
        const takosToken = Array.from(
            randomarray,
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")
        const result = await takostoken.create({
            token: takosToken,
        })
        const roomMenber = await rooms.findOne({
            uuid: roomID,
        })
        if (!roomMenber) {
            ws.send(
                JSON.stringify({
                    status: false,
                    explain: "Room Not Found",
                }),
            )
            return
        }
        const friend = roomMenber.users.find((user) =>
            user.userid !== session.uuid
        )
        if (!friend) {
            ws.send(
                JSON.stringify({
                    status: false,
                    explain: "Friend Not Found",
                }),
            )
            return
        }
        if (typeof friend.userid !== "string") {
            ws.send(
                JSON.stringify({
                    status: false,
                    explain: "Friend Not Found",
                }),
            )
            return
        }
        const frienduuid = friend.userid
        const messageid = crypto.randomUUID()
        await messages.create({
            userid: session.uuid,
            roomid: roomID,
            message,
            read: [],
            messageType: MessageType,
            messageid,
        })
        const sendFriendServer = await fetch(
            `http://${
                splitUserName(frienduuid).domain
            }/api/v1/server/talk/send`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    roomid: roomID,
                    sender: session.uuid,
                    token: takosToken,
                    message,
                    uuid: session.uuid,
                    messageType: MessageType,
                    messageid,
                }),
            },
        )
        if (sendFriendServer.status !== 200) {
            //メッセージ削除
            await messages.deleteOne({
                messageid,
            })
            ws.send(
                JSON.stringify({
                    status: false,
                    explain: "Failed to send message",
                }),
            )
            return
        }
        ws.send(
            JSON.stringify({
                status: true,
            }),
        )
    } else {
        ws.send(
            JSON.stringify({
                status: false,
                explain: "Room Type is not found",
            }),
        )
        return
    }
}
function sendConecctingUserMessage(
    roomid: string,
    message: string,
    sender: string,
    time: any,
    messageid: string,
    messageType: string,
) {
    //sessionsにroomidが同じユーザーを探す
    sessions.forEach(async (session, key) => {
        if (session.talkingRoom === roomid) {
            if (splitUserName(sender).domain !== env["serverDomain"]) {
                const takosTokenArray = new Uint8Array(16)
                const randomarray = crypto.getRandomValues(takosTokenArray)
                const takosToken = Array.from(
                    randomarray,
                    (byte) => byte.toString(16).padStart(2, "0"),
                ).join("")
                const remoteFriendInfo = await fetch(
                    `http://${
                        splitUserName(sender).domain
                    }/api/v1/server/friends/${sender}/profile?token=${takosToken}&serverDomain=${
                        env["serverDomain"]
                    }&type=id&reqUser=${session.uuid}`,
                )
                if (!remoteFriendInfo) {
                    return
                }
                const remoteFriendInfoJson = await remoteFriendInfo.json()
                console.log(remoteFriendInfoJson)
                session.ws.send(
                    JSON.stringify({
                        type: "message",
                        message,
                        sender: remoteFriendInfoJson.result.userName ||
                            "unknown",
                        senderNickName: remoteFriendInfoJson.result.nickName ||
                            "unknown",
                        time: time,
                        messageid,
                        messageType,
                    }),
                )
                return
            }
            const userInfo = await users.findOne({
                uuid: sender,
            })
            if (!userInfo) {
                return
            }
            session.ws.send(
                JSON.stringify({
                    type: "message",
                    message,
                    sender: userInfo?.userName + "@" + env["serverDomain"] ||
                        "unknown",
                    senderNickName: userInfo?.nickName || "unknown",
                    time: time,
                    messageid,
                    messageType,
                }),
            )
        }
    })
    return
}
function splitUserName(mail: string) {
    const mailArray = mail.split("@")
    return {
        userName: mailArray[0],
        domain: mailArray[1],
    }
}
async function readMessage(messageids: [string], sender: string) {
    console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",messageids, sender)
    //引数が適した値か確認
    sessions.forEach((session, key) => {
        if (session.ws.readyState !== WebSocket.OPEN) {
            sessions.delete(key)
        }
    })
    const session = sessions.get(sender)
    if (!session) {
        return
    }
    //messageidsが全てuuidか確認
    if (messageids.some((messageid) => messageid.length !== 36)) {
        return
    }
    session.ws.send(
        JSON.stringify({
            type: "read",
            messageids,
        }),
    )
    //送信元サーバーにreadしたことを送信
    if (splitUserName(sender).domain !== env["serverDomain"]) {
        const takosTokenArray = new Uint8Array(16)
        const randomarray = crypto.getRandomValues(takosTokenArray)
        const takosToken = Array.from(
            randomarray,
            (byte) => byte.toString(16).padStart(2, "0"),
        ).join("")
        await takostoken.create({
            token: takosToken,
        })
        const result = await fetch(`http://${splitUserName(sender).domain}/api/v1/server/talk/read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                roomid: session.talkingRoom,
                messageids,
                reader: session.uuid,
                token: takosToken,
            }),
        })
        if (result.status !== 200) {
            return
        }
    }
}