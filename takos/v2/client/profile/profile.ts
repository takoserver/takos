import { type Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import User from "../../../models/users.ts"
import Sessionid from "@/models/sessionid.ts"
import { load } from "@std/dotenv"
import AllowKey from "@/models/keys/allowKey.ts"
import Keys from "@/models/keys/keys.ts"
const env = await load()

const app = new Hono()

app.get("/", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid")
  if (!sessionid) {
    return c.json({ status: false, error: "sessionid is not found" }, {
      status: 200,
    })
  }
  const session = await Sessionid.findOne({ sessionid: sessionid })
  if (!session) {
    return c.json({ status: false, error: "session is not found" }, {
      status: 200,
    })
  }
  const userInfo = await User.findOne({ userName: session.userName })
  if (!userInfo) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 200,
    })
  }
  let allowKey: any[] = [];
  let Keys2: any[]
  allowKey = await AllowKey.find({ userName: userInfo.userName,
    $ne : {
      deliveryedSessionId: sessionid
    }
   })
  Keys2 = await Keys.find({ userName: userInfo.userName,
    $ne : {
      deliveryedSessionId: sessionid
    }
   })
   if(!allowKey) {
    allowKey = []
   } else {
    allowKey.map((k) => {
      return {
        timestamp: k.timestamp,
        key: k.key,
        sign: k.sign,
      }
    })
   }
    if(!Keys2) {
      Keys2 = []
    } else {
      Keys2.map((k) => {
        return {
          timestamp: k.timestamp,
          hashHex: k.hashHex,
          encryptedIdentityKey: k.encryptedIdentityKey.find((i: { sessionid: string; }) => i.sessionid === sessionid),
          encryptedAccountKey: k.encryptedAccountKey.find((i: { sessionid: string; }) => i.sessionid === sessionid),
        }
      }).filter((k) => k.encryptedIdentityKey !== undefined && k.encryptedAccountKey !== undefined)
    }
  return c.json({
    status: true,
    data: {
      userName: userInfo.userName,
      userId: userInfo.userName + "@" + env["DOMAIN"],
      nickName: userInfo.nickName,
      age: userInfo.age,
      setup: userInfo.setup,
      devicekey: session.deviceKey,
      updates: {
        identityKeyAndAccountKey: Keys2,
        trustedKey: allowKey,
      },
    },
  }, 200)
})

export default app