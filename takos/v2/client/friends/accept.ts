// deno-lint-ignore-file
import { Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import Sessionid from "@/models/sessionid.ts"
import User from "@/models/users.ts"
import Requests from "@/models/requests.ts"
import { acceptFriendRequest } from "@/v2/client/friends/acceptActions.ts"
import { load } from "@std/dotenv"
import { splitUserName } from "@/utils/utils.ts"
import friends from "@/models/friends.ts"
import Request from "@/models/requests.ts"
import sendRequests from "@/models/sendRequests.ts"
import FriendRoom from "@/models/friend/room.ts"
import roomkeys from "@/models/friend/roomkeys.ts"
import uuidv7, { timestamp } from "ui7"
const env = await load()

const app = new Hono()

app.post("/", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid")
  if (!sessionid) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 500,
    })
  }
  const session = await Sessionid.findOne({ sessionid: sessionid })
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 500,
    })
  }
  const userInfo = await User.findOne({ userName: session.userName })
  if (!userInfo) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    })
  }
  let body
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ status: false }, 400)
  }
  const { uuid, roomKey, hashHex } = body
  if (!hashHex) return c.json({ status: false }, 400)
  if (!uuid) return c.json({ status: false }, 400)
  const request = await Requests.findOne({ uuid })
  if (!request) return c.json({ status: false }, 400)
  if (request.targetName !== userInfo.userName) {
    return c.json({ status: false }, 400)
  }
  switch (request.type) {
    case "friend": {
      const { requesterId, targetName } = request
      const { userName: requesterName, domain: requesterDomain } = splitUserName(requesterId)
      if (requesterDomain !== env["DOMAIN"]) {
        return c.json({
          status: false,
          message: {
            error: "developing",
          },
        }, 400)
      }
      await friends.create({
        userName: requesterName,
        friendId: targetName + "@" + env["DOMAIN"],
      })
      await friends.create({
        userName: targetName,
        friendId: requesterName + "@" + env["DOMAIN"],
      })
      await Request.deleteOne({ uuid: request.uuid })
      await sendRequests.deleteOne({ uuid: request.uuid })
      // create room
      const roomKeyJson = roomKey
      if (!Array.isArray(roomKeyJson)) {
        return c.json({ status: false, error: "invide format" }, 400)
      }
      for (const key of roomKeyJson) {
        if (typeof key.userId !== "string" || typeof key.key !== "object") {
          return c.json({ status: false, error: "invide typeof" }, 400)
        }
      }
      const room = await FriendRoom.findOne({
        users: {
          $all: [userInfo.userName + "@" + env["DOMAIN"], requesterId],
        },
      })
      if (!!room) {
        return c.json({ status: false }, 400)
      }
      if (
        (() => {
          for (const key of roomKeyJson) {
            if (
              key.userId === requesterId ||
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
      const roomid = uuidv7() + "@" + env["DOMAIN"]
      await FriendRoom.create({
        roomid,
        users: [userInfo.userName + "@" + env["DOMAIN"], requesterId],
      })
      await roomkeys.create({
        roomid,
        key: roomKeyJson,
        keyHashHex: hashHex,
      })
      return c.json({ status: true }, 200)
    }
    default:
      return c.json({ status: false }, 400)
  }
})

export default app
