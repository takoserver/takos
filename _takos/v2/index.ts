// index.ts
import servers from "./server/index.ts"
import clients from "./client/index.ts"
import { Hono } from "hono"
import { getPath } from "hono/utils/url";
const app = new Hono()
app.route("/server", servers)
app.route("/client", clients)
export default app