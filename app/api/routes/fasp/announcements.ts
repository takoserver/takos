import { Hono } from "hono";
import authRequired from "../../utils/auth.ts";
import { sendAnnouncement } from "../../services/fasp.ts";

const app = new Hono();
app.use("/fasp/data_sharing/v0/announcements", authRequired);

app.post("/fasp/data_sharing/v0/announcements", async (c) => {
  const body = await c.req.json().catch(() => null) as
    | Record<string, unknown>
    | null;
  if (
    !body ||
    typeof body.source !== "object" ||
    !Array.isArray(body.objectUris) ||
    body.objectUris.length === 0 ||
    typeof body.category !== "string"
  ) {
    return c.json({ error: "Invalid body" }, 422);
  }
  const ok = await sendAnnouncement(
    body.source as Record<string, unknown>,
    body.category as "content" | "account",
    body.eventType as "new" | "update" | "delete" | "trending" | undefined,
    body.objectUris as string[],
    body.moreObjectsAvailable as boolean | undefined,
  );
  if (!ok) {
    return c.json({ error: "Announcement failed" }, 500);
  }
  return c.body(null, 204);
});

export default app;
