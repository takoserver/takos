import { type Context, Hono } from "hono"
import Keys from "@/models/keys/keys.ts"
import User from "@/models/users.ts"
import { cors } from "hono/cors"
import { splitUserName } from "@/utils/utils.ts"
import MasterKey from "@/models/masterKey.ts"
import { load } from "@std/dotenv"
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
  const identityAndAccountKeys = keys.map((key) => {
    return {
      identityKey: key.identityKeyPub,
      accountKey: key.accountKeyPub,
      timestamp: key.timestamp,
      hashHex: key.hashHex,
    }
  }).sort((a, b) => {
    return Number(new Date(a.timestamp)) - Number(new Date(b.timestamp))
  })
  const masterKey = await MasterKey.findOne(
    { userName: splitUserName(userId).userName },
  )
  return c.json({ status: true, keys: identityAndAccountKeys, masterKey: masterKey?.masterKey })
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
