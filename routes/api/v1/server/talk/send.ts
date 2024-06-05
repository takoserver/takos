import rooms from "../../../../../models/rooms.ts"
import messages from "../../../../../models/messages.ts"
import externalUsers from "../../../../../models/externalUsers.ts"
import redis from "redis"
import { load } from "$std/dotenv/mod.ts"
const env = await load()
const redisURL = env["REDIS_URL"]
const pubClient = redis.createClient({
  url: redisURL,
})
await pubClient.connect()
export const handler = {
  async POST(req: Request, ctx: any) {
    const data = await req.json()
    const { roomid, sender, token, message, uuid } = data
    if (
      roomid === "" || roomid === null || roomid === undefined ||
      sender === "" || sender === null || sender === undefined ||
      token === "" || token === null || token === undefined ||
      message === "" || message === null || message === undefined ||
      uuid === "" || uuid === null || uuid === undefined
    ) {
      return new Response(JSON.stringify({ status: false }), { status: 400 })
    }
    const { domain, userName } = splitUserName(sender)
    const isTrueToken = await fetch(
      `https://${domain}/api/v1/server/token?token=` + token,
    )
    if (isTrueToken.status !== 200) {
      return new Response(JSON.stringify({ status: false }), { status: 400 })
    }
    const room = await rooms.findOne({ roomid })
    if (room === null || room === undefined) {
      return new Response(JSON.stringify({ status: false }), { status: 400 })
    }
    const isRoomUser = room.users.find((user) => user.userid === uuid)
    if (isRoomUser === undefined) {
      return new Response(JSON.stringify({ status: false }), { status: 400 })
    }
    const uuidDomain = splitUserName(uuid).domain
    if (uuidDomain !== domain) {
      return new Response(JSON.stringify({ status: false }), { status: 400 })
    }
    const isAlredyAuth = await externalUsers.findOne({ uuid })
    if (isAlredyAuth === null || isAlredyAuth === undefined) {
      await externalUsers.create({ uuid: uuid, domain, userName })
    }
    await messages.create({
      userid: uuid,
      roomid,
      sender,
      message,
      read: [],
      messageid: crypto.randomUUID(),
    })
    pubClient.publish("takos", JSON.stringify({ roomid, message }))
    return new Response(JSON.stringify({ status: true }), { status: 200 })
  },
}
function splitUserName(mail: string) {
  const mailArray = mail.split("@")
  return {
    userName: mailArray[0],
    domain: mailArray[1],
  }
}