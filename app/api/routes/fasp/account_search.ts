import { Hono } from "hono";
import authRequired from "../../utils/auth.ts";
import { accountSearch } from "../../services/fasp.ts";

const app = new Hono();
app.use("/fasp/account_search/*", authRequired);

app.get("/fasp/account_search", async (c) => {
  const term = c.req.query("term");
  const next = c.req.query("next");
  if (!term && !next) {
    return c.json({ error: "term or next is required" }, 400);
  }
  const limit = Number(c.req.query("limit") ?? "20");
  const result = await accountSearch(term, limit, next);
  return c.json(result);
});

export default app;
