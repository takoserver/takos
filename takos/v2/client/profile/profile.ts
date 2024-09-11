import { type Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import User from "../../../models/users.ts"
import Sessionid from "@/models/sessionid.ts"
import { load } from "@std/dotenv"
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
  console.log(userInfo)
  return c.json({
    status: true,
    data: {
      userName: userInfo.userName,
      userId: userInfo.userName + "@" + env["DOMAIN"],
      nickName: userInfo.nickName,
      age: userInfo.age,
      setup: userInfo.setup,
      devicekey: session.deviceKey,
    },
  }, 200)
})

export default app
