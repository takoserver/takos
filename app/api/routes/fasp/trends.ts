import { Hono } from "hono";
import type { Context } from "hono";
import authRequired from "../../utils/auth.ts";
import { fetchTrends } from "../../services/fasp.ts";

const app = new Hono();
app.use("/fasp/trends/*", authRequired);

function collectParams(c: Context) {
  const params: Record<string, string> = {};
  for (const key of ["withinLastHours", "maxCount", "language"]) {
    const v = c.req.query(key);
    if (v) params[key] = v;
  }
  return params;
}

app.get("/fasp/trends/content", async (c) => {
  const data = await fetchTrends("content", collectParams(c));
  return c.json(data);
});

app.get("/fasp/trends/hashtags", async (c) => {
  const data = await fetchTrends("hashtags", collectParams(c));
  return c.json(data);
});

app.get("/fasp/trends/links", async (c) => {
  const data = await fetchTrends("links", collectParams(c));
  return c.json(data);
});

export default app;
