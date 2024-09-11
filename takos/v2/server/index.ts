// books.ts
import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import ping from "./ping.ts"
import pubkey from "./pubkey.ts"
import activity from "@/v2/server/activity.ts"
import { takosSign } from "@/utils/middlewares.ts"
const app = new Hono()
app.use(takosSign)
app.use(bodyLimit({
  maxSize: 100 * 1024,
})).route("/ping", ping)
app.route("/activity", activity)
app.route("/pubkey", pubkey)
export default app
