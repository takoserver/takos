import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import Sessionid from "@/models/sessionid.ts"
import User from "@/models/users.ts"
import AllowKey from "@/models/keys/allowKey.ts"

const app = new Hono()

app.post("/recognition", async (c) => {
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
  const { key: keyString, sign } = body
  const key = JSON.parse(keyString)
  if (!key.userId || !key.keyHash || !key.type || !key.timestamp || !sign) {
    return c.json({ status: false }, 400)
  }
  if (key.type !== "recognition") return c.json({ status: false }, 400)
  //if keyHash is not sha256 hash, return 400
  if (key.keyHash.length !== 64) return c.json({ status: false }, 400)
  const existingKey = await AllowKey.findOne({
    userName: userInfo.userName,
    keyHashHex: key.keyHash,
  })
  if (!existingKey) return c.json({ status: false }, 400)
  await AllowKey.create({
    userName: userInfo.userName,
    key: key,
    sign: sign,
    keyHashHex: key.keyHash,
  })
  return c.json({ status: true })
})

app.post("/allow", async (c) => {
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
  const { key: keyString, sign } = body
  const key = JSON.parse(keyString)
  if (!key.userId || !key.keyHash || !key.type || !key.timestamp || !sign) {
    return c.json({ status: false }, 400)
  }
  if (key.type === "recognition") return c.json({ status: false }, 400)
  //if keyHash is not sha256 hash, return 400
  if (key.keyHash.length !== 64) return c.json({ status: false }, 400)
  const existingKey = await AllowKey.findOne({
    userName: userInfo.userName,
    keyHashHex: key.keyHash,
    type: "allow",
  })
  const existingKey2 = await AllowKey.findOne({
    userName: userInfo.userName,
    keyHashHex: key.keyHash,
    type: "recognition",
  })
  if (!existingKey2) return c.json({ status: false }, 400)
  if (existingKey) return c.json({ status: false }, 400)
  await AllowKey.create({
    userName: userInfo.userName,
    key: key,
    sign: sign,
    keyHashHex: key.keyHash,
    type: "allow",
    timestamp: key.timestamp,
  })
  return c.json({ status: true })
})

app.post("/saved", async (c) => {
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
  const { key: keyString } = body
  const key = JSON.parse(keyString)
  if (!key) return c.json({ status: false }, 400)
  if (!key.userId || !key.keyHash || !key.type) return c.json({ status: false }, 400)
  await AllowKey.updateOne({ userName: userInfo.userName, key: key }, {
    $push: {
      deliveryedSessionId: sessionid,
    },
  })
  return c.json({ status: true })
})

export default app
