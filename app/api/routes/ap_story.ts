import { Hono } from "hono";
import { zStoryObject } from "../models/story.ts";
import { deliverToRecipients } from "../federation/deliver.ts";
import { buildStoryIRI, isLocalActor, nowISO } from "../utils/ap.ts";

export const story = new Hono();

// outbox: ローカル投稿 -> Create{Story}
story.post("/ap/users/:name/outbox/story", async (c) => {
  const actor = `https://${c.req.header("host")}/users/${c.req.param("name")}`;
  if (!await isLocalActor(actor)) return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json();
  // body: { object: <Story>, to?, cc?, bto?, bcc? }
  const storyObj = zStoryObject.parse({
    ...body.object,
    attributedTo: actor,
    published: body.object?.published ?? nowISO(),
    expiresAt: body.object?.expiresAt ??
      new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });

  const id = buildStoryIRI(actor);
  storyObj.id = id;

  // DB 保存（省略: repo.createStory(storyObj)）
  // await repo.createStory(storyObj, body.to, body.cc, body.bto, body.bcc);

  // 配送
  await deliverToRecipients({
    activity: {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://raw.githubusercontent.com/takoserver/takos/master/docs/ap-story/v1.jsonld",
      ],
      type: "Create",
      actor,
      to: body.to ?? [],
      cc: body.cc ?? [],
      bto: body.bto ?? [],
      bcc: body.bcc ?? [],
      object: storyObj,
    },
    to: body.to ?? [],
    cc: body.cc ?? [],
    bto: body.bto ?? [],
    bcc: body.bcc ?? [],
  });

  return c.json({ id });
});

// inbox: Create{Story} 受信
story.post("/ap/inbox", async (c) => {
  const activity = await c.req.json();
  if (activity?.type === "Create" && activity?.object?.type === "Story") {
    try {
      const _obj = zStoryObject.parse(activity.object);
      // await repo.saveRemoteStory(obj, activity);
      return c.json({ ok: true });
    } catch (_e) {
      return c.json({ ok: false }, 400);
    }
  }
  // 他の Activity へフォールバック
  return c.json({ ok: true });
});

// 現在有効なストーリーの一覧
story.get("/users/:name/stories", (c) => {
  const actor = `https://${c.req.header("host")}/users/${c.req.param("name")}`;
  const _now = new Date();
  // const items = await repo.findStories({ actor, expiresAfter: _now }); // 期限内のみ
  const items: unknown[] = []; // 実装: DB から取り出す
  return c.json({
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://raw.githubusercontent.com/takoserver/takos/master/docs/ap-story/v1.jsonld",
    ],
    "id": `${actor}/stories`,
    "type": "OrderedCollection",
    "totalItems": items.length,
    "orderedItems": items,
  });
});

export default story;
