import { type Context, Hono } from "hono"
import Keys from "@/models/keys/keys.ts"
import User from "@/models/users.ts"
import { cors } from "hono/cors"
import { splitUserName } from "@/utils/utils.ts"

const app = new Hono()

app.use(
  "/",
  cors({
    origin: "*",
    allowMethods: ["GET"],
  }),
)

app.get("/", async (c: Context) => {
  const userName = c.req.query("userName")
  if (!userName) {
    return c.json({ status: false, message: "userName is required" }, 400)
  }
  const user = await User.findOne(
    { userName: splitUserName(userName).userName },
  )
  if (!user) {
    return c.json({ status: false, message: "User not found" }, 404)
  }
  const keys = await Keys.find(
    { userName: splitUserName(userName).userName },
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
  return c.json({ status: true, keys: identityAndAccountKeys, masterKey: user.masterKey })
})

export default app
