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
import { IdentityKeyPub } from "takosEncryptInk"
import AllowKey from "@/models/keys/allowKey.ts"
const env = await load()

const app = new Hono()

app.get("/:userId/friend", async (c: Context) => {
  const userId = c.req.param("userId")
  const limit = Number(c.req.param("limit")) || 50
  const before = c.req.param("before") || ""
  const after = c.req.param("after") || ""
  const ignoreKeysString = c.req.param("ignoreKeys") || ""
  const getKeysAllowedInfo = (() => {
    const a = c.req.param("getKeysAllowedInfo") || false
    return a === "true"
  })()
  // around, before, afterはどれか一つだけ指定可能
  if ((before && after)) {
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
  const keysHashHex: string[] = messages.map((message) => {
    return message.roomKeyHashHex
  })
  let ignoreKeys
  try {
    ignoreKeys = JSON.parse(ignoreKeysString)
  } catch (error) {
    ignoreKeys = []
  }
  keysHashHex.filter((key) => {
    return !ignoreKeys.includes(key)
  })
  const keys = await FriendKeys.find({
    roomid,
    keyHashHex: { $in: keysHashHex },
  })
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
  if (keysArray.length === 0) {
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
  for (const message of messageList) {
    const identityKeyHashHex = message.message.signature.hashedPublicKeyHex
    if (identityKeys[message.userId] === undefined) {
      identityKeys[message.userId] = []
      const identityKey = await Keys.findOne({
        userName: splitUserName(message.userId).userName,
        hashHex: identityKeyHashHex,
      })
      if (identityKey) {
        identityKeys[message.userId].push(identityKey.identityKeyPub)
      }
    }
  }
  let memberAllowedInfo
  if (getKeysAllowedInfo) {
    const roomMemberUserIds = room.users.filter((user) => {
      return user !== userInfo.userName + "@" + env["DOMAIN"]
    })
    memberAllowedInfo = AllowKey.find({
      userName: userInfo.userName,
      key: {
        //メンバー鍵の署名が有効なもの
        $elemMatch: {
          userId: { $in: roomMemberUserIds },
          sign: { $ne: null },
        },
      },
    })
  }
  return c.json({
    status: true,
    messages: messageList,
    keys: keysArray,
    identityKeys,
    memberAllowedInfo,
  })
})
export default app
