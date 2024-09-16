import { Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import Sessionid from "@/models/sessionid.ts"
import User from "@/models/users.ts"
import FriendRoom from "@/models/friend/room.ts"
import FriendMessage from "@/models/friend/message.ts"
import FriendKeys from "@/models/friend/roomkeys.ts"
import { type EncryptedMessage } from "@takos/takos-encrypt-ink"
import Keys from "@/models/keys/keys.ts"
import { load } from "@std/dotenv"
import uuid from "ui7"
const env = await load()

const app = new Hono()

app.post("/friend", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid")
  if (!sessionid) {
    return c.json({ status: false, message: "Unauthorized" }, 401)
  }
  const session = await Sessionid.findOne({ sessionid })
  if (!session) {
    return c.json({ status: false, message: "Unauthorized" }, 401)
  }
  const userInfo = await User.findOne({
    userName: session.userName,
  })
  if (!userInfo) {
    return c.json({ status: false, message: "Unauthorized" }, 401)
  }
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ status: false, message: "Invalid body" }, 400)
  }
  const { message: messageobj, friendId } = body
  const message: EncryptedMessage = messageobj
  const room = await FriendRoom.findOne({
    users: { $all: [session.userName + "@" + env["DOMAIN"], friendId] },
  })
  if (!room) {
    return c.json({ status: false, message: "Room not found" }, 404)
  }
  const roomid = room.roomid
  const isRoomKey = !!await FriendKeys.findOne({
    roomid,
    keyHashHex: message.value.data.encryptedKeyHashHex,
  })
  if (!isRoomKey) {
    return c.json({ status: false, message: "Invalid room key" }, 400)
  }
  const isTrueIdentityKey = !!await Keys.findOne({
    userName: session.userName,
    hashHex: message.signature.hashedPublicKeyHex,
  })
  if (!isTrueIdentityKey) {
    return c.json({ status: false, message: "Invalid identity key" }, 400)
  }
  await FriendMessage.create({
    roomid,
    userId: session.userName + "@" + env["DOMAIN"],
    messageObj: message,
    read: false,
    messageid: uuid(),
    roomKeyHashHex: message.value.data.encryptedKeyHashHex,
  })
  return c.json({ status: true })
})

export default app
