import { Hono } from "hono";
import { z } from "zod";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import type { FaspConfigDoc } from "../../shared/types.ts";

/**
 * FASP 設定取得・更新エンドポイント。
 * docs/FASP.md 7.1 の設定例に基づき base_url や capability を管理する。
 */
const app = new Hono();

app.get("/config", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const config = await db.findFaspConfig();
  return c.json({ config });
});

const configSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string(),
  capabilities: z.object({
    data_sharing: z.string().optional(),
    trends: z.string().optional(),
    account_search: z.string().optional(),
  }),
});

app.put("/config", async (c) => {
  const env = getEnv(c);
  const db = createDB(env);
  const body = await c.req.json();
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid body" }, 400);
  }
  const config: FaspConfigDoc = {
    enabled: parsed.data.enabled,
    base_url: parsed.data.baseUrl,
    capabilities: parsed.data.capabilities,
  };
  await db.saveFaspConfig(config);
  return c.body(null, 204);
});

export default app;
