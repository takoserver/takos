import { Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import Sessionid from "@/models/sessionid.ts"
import User from "@/models/users.ts"
import FriendRoom from "@/models/friend/room.ts"
import FriendMessage from "@/models/friend/message.ts"
import FriendKeys from "@/models/friend/roomkeys.ts"
import { load } from "@std/dotenv"
import { splitUserName } from "@/utils/utils.ts"
import friends from "@/models/friends.ts"
import Keys from "@/models/keys/keys.ts"
import { EncryptedDataAccountKey, generateKeyHashHexJWK, IdentityKeyPub } from "takosEncryptInk"
import AllowKey from "@/models/keys/allowKey.ts"
import MasterKey from "@/models/masterKey.ts"
import roomkeys from "@/models/friend/roomkeys.ts"
const env = await load()

const app = new Hono()

app.post("/friend", async (c: Context) => {
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ status: false, message: "Invalid body" }, 400)
  }
  const userId = body.userId
  const limit = Number(body.limit) || 50
  const before = body.before || ""
  const after = body.after || ""
  const messageid = body.messageid || ""
  const ignoreKeys = body.ignoreKeys || []
  const ignoreMasterKeys = body.ignoreMasterKeys || []
  const ignoreIdentityKeys = body.ignoreIdentityKeys || []
  // beforeとafterとmessageidのいづれかがないとエラー複数もエラー
  if (before && after) {
    return c.json({ status: false, message: "Invalid parameter" }, 400)
  }
  if (before && messageid) {
    return c.json({ status: false, message: "Invalid parameter" }, 400)
  }
  if (after && messageid) {
    return c.json({ status: false, message: "Invalid parameter" }, 400)
  }
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
  const { userName: targetUserName, domain: targetDomain } = splitUserName(
    userId,
  )
  const isFriend = !!await friends.findOne({
    userName: userInfo.userName,
    friendId: userId,
  })
  if (!isFriend) {
    return c.json({ status: false, message: "Not friend" }, 403)
  }
  if (targetDomain !== env.DOMAIN) {
    return c.json({ status: false, message: "Invalid domain" }, 400)
  }
  const room = await FriendRoom.findOne({
    users: { $all: [userInfo.userName + "@" + env["DOMAIN"], userId] },
  })
  if (!room) {
    return c.json({ status: false, message: "Room not found" }, 404)
  }
  const roomid = room.roomid
  let messages
  if (before) {
    const beforeMessage = await FriendMessage.findOne({
      roomid,
      messageid: before,
    })
    if (!beforeMessage) {
      return c.json({ status: false, message: "Message not found" }, 404)
    }
    messages = await FriendMessage.find({
      roomid,
      messageid: { $lt: before },
    }).sort({ messageid: -1 }).limit(limit)
  } else if (after) {
    const afterMessage = await FriendMessage.findOne({
      roomid,
      messageid: after,
    })
    if (!afterMessage) {
      return c.json({ status: false, message: "Message not found" }, 404)
    }
    messages = await FriendMessage.find({
      roomid,
      messageid: { $gt: after },
    }).sort({ messageid: 1 }).limit(limit)
  } else if (messageid) {
    console.log(messageid)
    messages = await FriendMessage.find({
      roomid,
      messageid: messageid,
    }).sort({ messageid: 1 }).limit(1)
  } else {
    messages = await FriendMessage.find({
      roomid,
    }).sort({ messageid: -1 }).limit(limit)
  }
  const messageList = messages.map((message) => {
    return {
      messageid: message.messageid,
      userId: message.userId,
      message: message.messageObj,
      timestamp: message.timestamp,
      type: message.messageObj.type,
    }
  })
  let keysHashHex: string[] = messages.map((message) => {
    return message.roomKeyHashHex
  })
  keysHashHex = keysHashHex.filter((key) => {
    return !ignoreKeys.includes(key)
  })
  const keysMessages = await FriendKeys.find({
    roomid,
    keyHashHex: { $in: keysHashHex },
  })
  const latestKeys = await FriendKeys.findOne({
    roomid,
    keyHashHex: { $in: keysHashHex },
  }).sort({ timestamp: -1 }) || []
  const keysTemp = [keysMessages, latestKeys].flat()
  const keys = Array.from(new Set(keysTemp.map((key) => key.keyHashHex)))
    .map((keyHashHex) => keysTemp.find((key) => key.keyHashHex === keyHashHex)).filter((key) =>
      key !== undefined
    )
  //重複削除
  const keysArray = keys.map((keys) => {
    const key = keys.key.find((key: { userId: string }) => {
      return key.userId === userInfo.userName + "@" + env["DOMAIN"]
    })
    if (!key) {
      return null
    }
    return key.key
  }).filter((key) => {
    return key !== null
  }).sort((a, b) => {
    return a.timestamp - b.timestamp
  })
  if (keysArray.length === 0 && messageList.length === 0) {
    const latestKey = await FriendKeys.findOne({
      roomid,
    }).sort({ timestamp: -1 })
    if (!latestKey) {
      return c.json({ status: false, message: "Key not found" }, 404)
    }
    const key = latestKey.key.find((key: { userId: string }) => {
      return key.userId === userInfo.userName + "@" + env["DOMAIN"]
    })
    if (!key) {
      return c.json({ status: false, message: "Key not found2" }, 404)
    }
    keysArray.push(key.key)
  }
  const identityKeys: {
    [key: string]: IdentityKeyPub[]
  } = {}
  const alerdyPushed: string[] = []
  for (const message of messageList) {
    const identityKeyHashHex = message.message.signature.hashedPublicKeyHex
    if (alerdyPushed.includes(identityKeyHashHex)) {
      continue
    }
    const identityKey = await Keys.findOne({
      userName: splitUserName(message.userId).userName,
      hashHex: identityKeyHashHex,
    })
    if (!identityKey) {
      continue
    }
    if (!identityKeys[message.userId]) {
      identityKeys[message.userId] = []
    }
    identityKeys[message.userId].push(identityKey.identityKeyPub)
    alerdyPushed.push(identityKeyHashHex)
  }
  let masterKey
  if (keysArray.length > 0) {
    let masterKeys: any[] = []
    for (const identityKey in identityKeys) {
      const value = identityKeys[identityKey]
      const objkey = identityKey
      const userName = splitUserName(objkey).userName
      const domain = splitUserName(objkey).domain
      if (domain !== env.DOMAIN) {
        return c.json({ status: false, message: "Invalid domain" }, 400)
      }
      const keysHashHex = value.map((key) => {
        return key.sign.hashedPublicKeyHex
      })
      const keys = await MasterKey.find({
        userName,
        hashHex: { $in: keysHashHex },
      })
      if (!keys) {
        return c.json({ status: false, message: "Key not found" }, 404)
      }
      masterKeys = masterKeys.concat(keys.map((key) => {
        return {
          masterKey: key.masterKey,
          hashHex: key.hashHex,
        }
      }))
    }
    masterKey = masterKeys
  }
  masterKey = masterKey?.filter((key) => {
    return !ignoreMasterKeys.includes(key.hashHex)
  })
  for (const key in identityKeys) {
    const filteredKeys = []
    for (const identityKey of identityKeys[key]) {
      if (!ignoreIdentityKeys.includes(await generateKeyHashHexJWK(identityKey))) {
        filteredKeys.push(identityKey)
      }
    }
    identityKeys[key] = filteredKeys
  }
  return c.json({
    status: true,
    messages: messageList,
    keys: keysArray,
    identityKeys,
    masterKey,
  })
})
app.get("/friend/updateRoomKey", async (c: Context) => {
  return c.json({ status: false, message: "Method not allowed" }, 405)
})

app.post("/friend/updateRoomKey", async (c: Context) => {
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
    return c.json({ status: false }, 400)
  }
  const { friendId, roomKeys, keyHashHex }: {
    friendId: string
    roomKeys: {
      key: EncryptedDataAccountKey
      userId: string
    }[]
    keyHashHex: string
  } = body
  if (!keyHashHex) {
    return c.json({ status: false, message: "Invalid parameter" }, 400)
  }
  const { userName: targetUserName, domain: targetDomain } = splitUserName(
    friendId,
  )
  if (targetDomain !== env["DOMAIN"]) {
    return c.json({ status: false, message: "Invalid domain" }, 400)
  }
  const friendRoom = await FriendRoom.findOne({
    users: { $all: [userInfo.userName + "@" + env["DOMAIN"], friendId] },
  })
  if (!friendRoom) {
    return c.json({ status: false, message: "Room not found" }, 404)
  }
  const roomKeyJson = roomKeys
  if (!Array.isArray(roomKeyJson)) {
    return c.json({ status: false, error: "invide format" }, 400)
  }
  for (const key of roomKeyJson) {
    if (typeof key.userId !== "string" || typeof key.key !== "object") {
      return c.json({ status: false, error: "invide typeof" }, 400)
    }
  }
  if (
    (() => {
      for (const key of roomKeyJson) {
        if (
          key.userId === friendId ||
          key.userId === userInfo.userName + "@" + env["DOMAIN"]
        ) {
          return false
        }
      }
      return true
    })()
  ) {
    return c.json({ status: false }, 400)
  }
  await roomkeys.create({
    roomid: friendRoom.roomid,
    key: roomKeyJson,
    keyHashHex,
  })
  return c.json({ status: true }, 200)
})
export default app
