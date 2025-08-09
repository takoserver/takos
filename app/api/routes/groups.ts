import { Hono } from "hono";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import { getEnv } from "../../shared/config.ts";
import { jsonResponse } from "../utils/activitypub.ts";

// グループ管理 API
const app = new Hono();
app.use("/accounts/*", authRequired);

app.get("/accounts/:id/groups", async (c) => {
  const id = c.req.param("id");
  const db = createDB(getEnv(c));
  const account = await db.findAccountById(id);
  if (!account) return jsonResponse(c, { error: "Account not found" }, 404);
  const groups = await db.listGroups(id);
  // ActivityStreams 形式でグループ一覧を返す
  const items = groups.map((g) => ({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Group",
    id: g.id,
    name: g.name,
    members: g.members,
  }));
  return jsonResponse(
    c,
    {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "OrderedCollection",
      totalItems: items.length,
      orderedItems: items,
    },
    200,
    "application/activity+json",
  );
});

app.post("/accounts/:id/groups", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  // ActivityStreams Group オブジェクトの検証
  if (
    typeof body !== "object" ||
    body.type !== "Group" ||
    typeof body.name !== "string" ||
    !Array.isArray(body.members)
  ) {
    return jsonResponse(c, { error: "invalid group" }, 400);
  }
  const group = {
    id: typeof body.id === "string" ? body.id : crypto.randomUUID(),
    name: body.name,
    members: body.members.filter((m: unknown) => typeof m === "string"),
  };
  const db = createDB(getEnv(c));
  const account = await db.findAccountById(id);
  if (!account) return jsonResponse(c, { error: "Account not found" }, 404);
  await db.addGroup(id, group);
  return jsonResponse(
    c,
    {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Group",
      ...group,
    },
    201,
    "application/activity+json",
  );
});

app.delete("/accounts/:id/groups", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  let groupId: string | undefined;
  if (body && typeof body === "object") {
    if (body.type === "Delete" && typeof body.object === "string") {
      groupId = body.object;
    } else if (typeof body.id === "string") {
      groupId = body.id;
    }
  }
  if (!groupId) {
    return jsonResponse(c, { error: "invalid group id" }, 400);
  }
  const db = createDB(getEnv(c));
  const account = await db.findAccountById(id);
  if (!account) return jsonResponse(c, { error: "Account not found" }, 404);
  const groups = await db.removeGroup(id, groupId);
  const items = groups.map((g) => ({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Group",
    id: g.id,
    name: g.name,
    members: g.members,
  }));
  return jsonResponse(
    c,
    {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "OrderedCollection",
      totalItems: items.length,
      orderedItems: items,
    },
    200,
    "application/activity+json",
  );
});

export default app;
