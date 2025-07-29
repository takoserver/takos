import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import {
  createAddActivity,
  createObjectId,
  getDomain,
} from "../utils/activitypub.ts";
import { getEnv } from "../../shared/config.ts";
import { deliverToFollowers } from "../utils/deliver.ts";

/** ストーリーオブジェクト型定義 */
type Story = {
  _id: { toString(): string };
  attributedTo: string;
  content: string;
  published: string | Date;
  extra: {
    mediaUrl?: string;
    mediaType?: string;
    backgroundColor?: string;
    textColor?: string;
    expiresAt?: string | Date;
    views?: number;
  };
};

const app = new Hono();
app.use("/stories/*", authRequired);

async function listStoriesFor(
  user: string,
  env: Record<string, string>,
): Promise<Story[]> {
  const db = createDB(env);
  const account = await db.findAccountByUserName(user);
  if (!account) return [];
  const domain = env["ACTIVITYPUB_DOMAIN"] ?? "";
  const actorUrl = `https://${domain}/users/${user}`;
  const actors = [actorUrl, ...(account.following ?? [])];
  const stories = await db.findObjects({
    type: "Story",
    actor_id: { $in: actors },
    "extra.expiresAt": { $gt: new Date() },
    deleted_at: { $exists: false },
  }, { published: -1 }) as Story[];
  return stories;
}

// CORSミドルウェア
app.use(
  "/api/stories/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ストーリー一覧取得（自分とフォロー先）
app.get("/api/stories/:actor", async (c) => {
  try {
    const env = getEnv(c);
    const actor = c.req.param("actor");
    const stories = await listStoriesFor(actor, env);
    const formatted = stories.map((story) => ({
      id: String(story._id),
      author: story.attributedTo,
      content: story.content,
      mediaUrl: story.extra.mediaUrl,
      mediaType: story.extra.mediaType,
      backgroundColor: story.extra.backgroundColor,
      textColor: story.extra.textColor,
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      views: story.extra.views,
    }));
    return c.json(formatted);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return c.json({ error: "Failed to fetch stories" }, 500);
  }
});

// ストーリー作成
app.post("/api/stories", async (c) => {
  try {
    const body = await c.req.json();
    const { author, content, mediaUrl, mediaType, backgroundColor, textColor } =
      body;

    if (!author || !content) {
      return c.json({ error: "Author and content are required" }, 400);
    }

    // 24時間後に期限切れ
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const env = getEnv(c);
    const domain = env["ACTIVITYPUB_DOMAIN"] ?? getDomain(c);
    const db = createDB(env);
    const story = await db.saveObject(
      {
        _id: createObjectId(domain),
        type: "Story",
        attributedTo: author,
        content,
        published: new Date(),
        extra: {
          mediaUrl,
          mediaType,
          backgroundColor: backgroundColor || "#1DA1F2",
          textColor: textColor || "#FFFFFF",
          expiresAt,
          views: 0,
        },
        actor_id: `https://${domain}/users/${author}`,
        aud: { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [] },
      },
    ) as Story;

    const activity = createAddActivity(
      domain,
      `https://${domain}/users/${author}`,
      {
        id: String(story._id),
        type: "Story",
        object: story.extra.mediaUrl,
      },
    );
    deliverToFollowers(env, author, activity, domain);
    return c.json({
      id: String(story._id),
      author: story.attributedTo,
      content: story.content,
      mediaUrl: story.extra.mediaUrl,
      mediaType: story.extra.mediaType,
      backgroundColor: story.extra.backgroundColor,
      textColor: story.extra.textColor,
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      views: story.extra.views,
    }, 201);
  } catch (error) {
    console.error("Error creating story:", error);
    return c.json({ error: "Failed to create story" }, 500);
  }
});

// ストーリー閲覧
app.post("/api/stories/:id/view", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const id = c.req.param("id");
    const story = await db.updateObject(id, { $inc: { "extra.views": 1 } }) as
      | Story
      | null;

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    return c.json({
      id: String(story._id),
      author: story.attributedTo,
      content: story.content,
      mediaUrl: story.extra.mediaUrl,
      mediaType: story.extra.mediaType,
      backgroundColor: story.extra.backgroundColor,
      textColor: story.extra.textColor,
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      views: story.extra.views,
    });
  } catch (error) {
    console.error("Error viewing story:", error);
    return c.json({ error: "Failed to view story" }, 500);
  }
});

// ストーリー削除
app.delete("/api/stories/:id", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const id = c.req.param("id");
    const res = await db.updateObject(id, {
      type: "Tombstone",
      deleted_at: new Date(),
    });
    if (!res) {
      return c.json({ error: "Story not found" }, 404);
    }
    return c.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error deleting story:", error);
    return c.json({ error: "Failed to delete story" }, 500);
  }
});

// 期限切れストーリーのクリーンアップ（定期実行用）
app.delete("/api/stories/cleanup", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const result = await db.deleteManyObjects({
      type: "Story",
      "extra.expiresAt": { $lt: new Date() },
    });

    return c.json({
      message: "Cleanup completed",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
    return c.json({ error: "Failed to cleanup expired stories" }, 500);
  }
});

export default app;
