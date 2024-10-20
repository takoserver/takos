import { Context, Hono } from "hono";
const app = new Hono();
app.get("/", (c: Context) => c.json({ status: true }));

export default app;
