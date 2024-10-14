import { type Context, Hono } from "hono"
import { getCookie } from "hono/cookie"
import User from "../../../models/users.ts"
import Sessionid from "@/models/sessionid.ts"

const app = new Hono()

app.get("/", async (c: Context) => {
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
  let icon: Uint8Array
  try {
    icon = await Deno.readFile(
      "./files/userIcon/" + userInfo.userName + ".jpg",
    )
  } catch (_error) {
    icon = await Deno.readFile("./people.jpeg")
  }
  return c.body(icon, 200)
})

export default app
