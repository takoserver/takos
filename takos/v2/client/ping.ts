import { Hono } from "hono";
const app = new Hono();
app.get("/", (c) => c.json({ status: true }));

export default app;
