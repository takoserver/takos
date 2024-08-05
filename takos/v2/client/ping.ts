// books.ts
import { Hono } from "hono";
const app = new Hono();
app.get("/", (c) => c.json("list books"));

export default app;
