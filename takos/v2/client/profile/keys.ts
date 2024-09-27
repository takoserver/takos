import { Context, Hono } from "hono"
import User from "@/models/users.ts"
import { getCookie } from "jsr:@hono/hono@^4.5.3/cookie"
import Sessionid from "@/models/sessionid.ts"
import Keys from "../../../models/keys/keys.ts"
import AllowKey from "@/models/keys/allowKey.ts"

const app = new Hono()

app.get("/", async (c: Context) => {
  const sessionid = getCookie(c, "sessionid")
  const hashHex = c.req.query("hashHex")
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
  if (!userInfo || userInfo.setup !== true) {
    return c.json({ status: false, error: "user is not found" }, {
      status: 500,
    })
  }
  // hashHexが指定してる鍵より新しい鍵をデータベースから取得
  const HashHexKey = await Keys.findOne({ hashHex: hashHex })
  if (!HashHexKey) {
    return c.json({ status: false, error: "key is not found hint: HashHex" }, {
      status: 500,
    })
  }
  const key = await Keys.find({
    timestamp: { $gt: HashHexKey.timestamp },
    userName: userInfo.userName,
  })
  if (!key) {
    return c.json({ status: false, error: "key is not found" }, {
      status: 500,
    })
  }
  return c.json({
    status: true,
    data: {
      identityKeyAndAndAccountKey: key.map((k) => {
        return {
          identityKeyPub: k.encryptedIdentityKey.map((i: { sessionid: string; key: any }) => {
            if (i.sessionid === sessionid) {
              return i.key
            }
            return null
          }).filter((i: null) => i !== null)[0],
          accountKeyPub: k.encryptedAccountKey.map((i: { sessionid: string; key: any }) => {
            if (i.sessionid === sessionid) {
              return i.key
            }
            return null
          }).filter((i) => i !== null)[0],

          hashHex: k.hashHex,
        }
      }),
    },
  }, 200)
})

app.post("/geted", async (c: Context) => {
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
  const { hashHex, type } = body
  if (!hashHex || !type) {
    return c.json({ status: false }, 400)
  }
  type typeValue = "identityKeyAndAccountKey" | "allowMasterKey"
  if (type !== "identityKeyAndAccountKey" && type !== "allowMasterKey") {
    return c.json({ status: false }, 400)
  }
  if (type === "identityKeyAndAccountKey") {
    const key = await Keys.findOne({
      hashHex: hashHex,
      userName: userInfo.userName,
    })
    if (!key) {
      return c.json({ status: false, error: "key is not found" }, {
        status: 500,
      })
    }
    const result = await Keys.updateOne({
      hashHex: hashHex,
      userName: userInfo.userName,
    }, {
      $push: {
        deliveryedSessionId: sessionid,
      },
    })
    console.log("Update result:", result)
    return c.json({
      status: true,
    }, 200)
  }
  if (type === "allowMasterKey") {
    const key = await AllowKey.findOne({
      key: {
        hashHex: hashHex,
      },
      userName: userInfo.userName,
    })
    if (!key) {
      return c.json({ status: false, error: "key is not found" }, {
        status: 500,
      })
    }
    AllowKey.updateOne({
      key: {
        hashHex: hashHex,
      },
      userName: userInfo.userName,
    }, {
      $push: {
        deliveryedSessionId: sessionid,
      },
    })
    return c.json({
      status: true,
    }, 200)
  }
})

app.post("/updateKeyShareKey", async (c: Context) => {})

export default app
