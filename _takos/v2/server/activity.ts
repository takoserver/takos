import { Hono } from "hono"
const app = new Hono()

app.post("/", (c) => {
  return c.json({
    status: 200,
  })
})
export default app
