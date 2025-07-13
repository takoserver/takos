import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import Instance from "./models/instance.ts";
import { authRequired } from "./auth.ts";

export function createAdminApp() {
  const app = new Hono();

  app.use("/*", authRequired);

  app.get("/admin/instances", async (c) => {
    const list = await Instance.find().lean();
    return c.json(list.map((i) => ({ host: i.host })));
  });

  app.post(
    "/admin/instances",
    zValidator("json", z.object({ host: z.string() })),
    async (c) => {
      const { host } = c.req.valid("json");
      const exists = await Instance.findOne({ host });
      if (exists) {
        return c.json({ error: "already exists" }, 400);
      }
      const inst = new Instance({ host });
      await inst.save();
      return c.json({ success: true });
    },
  );

  app.delete("/admin/instances/:host", async (c) => {
    const host = c.req.param("host");
    await Instance.deleteOne({ host });
    return c.json({ success: true });
  });

  return app;
}
