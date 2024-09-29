import { type Context, Hono } from "hono"
import Keys from "@/models/keys/keys.ts"
import User from "@/models/users.ts"
import { cors } from "hono/cors"
import { splitUserName } from "@/utils/utils.ts"
import MasterKey from "@/models/masterKey.ts"
import { load } from "@std/dotenv"
import { MasterKeyPub } from "takosEncryptInk"
const env = await load()

const app = new Hono()

app.use(
  "/",
  cors({
    origin: "*",
    allowMethods: ["GET"],
  }),
)

app.get("/", async (c: Context) => {
  const userId = c.req.query("userId")
  const latest = c.req.query("latest") === "true" ? true : false
  if (!userId) {
    return c.json({ status: false, message: "userName is required" }, 400)
  }
  const user = await User.findOne(
    { userName: splitUserName(userId).userName },
  )
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404)
  }
  const keys = await Keys.find(
    { userName: splitUserName(userId).userName },
  )
  if (latest) {
    const latestKey = keys.sort((a, b) => {
      return Number(b.timestamp) - Number(a.timestamp)
    })[0]
    if (!latestKey) {
      return c.json({ status: false, message: "Keys not found" }, 404)
    }
    const latestKeyResult = {
      identityKey: latestKey.identityKeyPub,
      accountKey: latestKey.accountKeyPub,
      timestamp: latestKey.timestamp,
      hashHex: latestKey.hashHex,
    }
    const masterKey = await MasterKey.findOne(
      {
        userName: splitUserName(userId).userName,
        hashHex: latestKey.identityKeyPub.sign.hashedPublicKeyHex,
      },
    )
    if (!masterKey) {
      return c.json({ status: false, message: "MasterKey not found" }, 404)
    }
    return c.json({ status: true, keys: latestKeyResult, masterKey: masterKey.masterKey })
  }
  const identityAndAccountKeys = keys.map((key) => {
    return {
      identityKey: key.identityKeyPub,
      accountKey: key.accountKeyPub,
      timestamp: key.timestamp,
      hashHex: key.hashHex,
    }
  })
  const masterKey = await MasterKey.find(
    { userName: splitUserName(userId).userName },
  )
  return c.json({
    status: true,
    keys: identityAndAccountKeys,
    masterKey: masterKey.map((key) => {
      key.masterKey
    }),
  })
})

app.get("/masterKey", async (c: Context) => {
  const userId = c.req.query("userId")
  if (!userId) {
    return c.json({ status: false, message: "userName is required" }, 400)
  }
  if (splitUserName(userId).domain !== env["DOMAIN"]) {
    return c.json({ status: false, message: "Invalid domain" }, 400)
  }
  const user = await User.findOne({ userName: splitUserName(userId).userName })
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404)
  }
  const hashHex = c.req.query("hashHex") || null
  if (!hashHex) {
    //最新のマスターキーを取得
    const masterKey = await MasterKey
      .findOne({ userName: user.userName })
      .sort({ createdAt: -1 })
    if (!masterKey) {
      return c.json({ status: false, message: "MasterKey not found" }, 404)
    }
    return c.json({ status: true, masterKey: masterKey.masterKey })
  }
  //指定されたハッシュ値のマスターキーを取得
  const masterKey = await MasterKey
    .findOne({ userName: user.userName, hashHex: hashHex })
  if (!masterKey) {
    return c.json({ status: false, message: "MasterKey not found" }, 404)
  }
  return c.json({ status: true, masterKey: masterKey.masterKey })
})
app.post("/masterKeys", async (c: Context) => {
  console.log("masterKeys")
  let body: {
    userId: string
    hashHex: string
  }[]
  try {
    body = await c.req.json()
  } catch (e) {
    return c.json({ status: false }, 400)
  }
  if (!body) {
    return c.json({ status: false }, 400)
  }
  const masterKeys = await Promise.all(body.map(async (key) => {
    if (!key.userId || !key.hashHex) {
      return null
    }
    if (splitUserName(key.userId).domain !== env["DOMAIN"]) {
      return null
    }
    const afterMasterKey = await MasterKey.findOne(
      { userName: splitUserName(key.userId).userName, hashHex: key.hashHex },
    )
    if (!afterMasterKey) {
      return null
    }
    return await MasterKey.find(
      {
        userName: splitUserName(key.userId).userName,
        timestamp: { $gt: afterMasterKey.timestamp },
      },
    )
  }))
  const result: {
    [key: string]: {
      masterKey: MasterKeyPub
      hashHex: string
    }[]
  } = {}
  masterKeys.forEach((keys, index) => {
    if (keys) {
      result[body[index].userId] = keys.map((key) => {
        return {
          masterKey: key.masterKey,
          hashHex: key.hashHex,
        }
      })
    }
  })
  return c.json({ status: true, masterKeys: result })
})

app.get("/accountKey", async (c: Context) => {
  const userId = c.req.query("userId")
  if (!userId) {
    return c.json({ status: false, message: "userName is required" }, 400)
  }
  if (splitUserName(userId).domain !== env["DOMAIN"]) {
    return c.json({ status: false, message: "Invalid domain" }, 400)
  }
  const user = await User.findOne({ userName: splitUserName(userId).userName })
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404)
  }
  const hashHex = c.req.query("hashHex")
  if (!hashHex) {
    return c.json({ status: false, message: "hashHex is required" }, 400)
  }
  const keys = await Keys.findOne({ userName: user.userName, hashHex: hashHex })
  if (!keys) {
    return c.json({ status: false, message: "Keys not found" }, 404)
  }
  return c.json({ status: true, accountKey: keys.accountKeyPub })
})
app.get("/identityKey", async (c: Context) => {
  const userId = c.req.query("userId")
  if (!userId) {
    return c.json({ status: false, message: "userName is required" }, 400)
  }
  if (splitUserName(userId).domain !== env["DOMAIN"]) {
    return c.json({ status: false, message: "Invalid domain" }, 400)
  }
  const user = await User.findOne({ userName: splitUserName(userId).userName })
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404)
  }
  const hashHex = c.req.query("hashHex")
  if (!hashHex) {
    return c.json({ status: false, message: "hashHex is required" }, 400)
  }
  const keys = await Keys.findOne({ userName: user.userName, hashHex: hashHex })
  if (!keys) {
    return c.json({ status: false, message: "Keys not found" }, 404)
  }
  return c.json({ status: true, identityKey: keys.identityKeyPub })
})

export default app
