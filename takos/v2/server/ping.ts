// books.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    status: 200,
  });
});
export default app;
