import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import {
  createCreateActivity,
  createDeleteActivity,
  createObjectId,
} from "../utils/activitypub.ts";
import { deliverToFollowers } from "../utils/deliver.ts";
import { getEnv } from "../../shared/config.ts";

/** ストーリーオブジェクト型定義 */
type Story = {
  _id: { toString(): string };
  attributedTo: string;
  content: string;
  published: string | Date;
  endTime: string | Date;
  type: string[];
  "x:overlays"?: unknown[];
  "x:rev"?: number;
  extra: {
    mediaUrl?: string;
    mediaType?: string;
    backgroundColor?: string;
    textColor?: string;
    views?: number;
  };
};

const app = new Hono();
app.use("/stories/*", authRequired);

/** 期限切れストーリーを Tombstone 化し Delete を配送 */
async function cleanupExpiredStories(
  env: Record<string, string>,
): Promise<number> {
  const db = createDB(env);
  const domain = env["ACTIVITYPUB_DOMAIN"] ?? "";
  const expired = await db.findObjects({
    type: { $in: ["x:Story"] },
    endTime: { $lt: new Date() },
  }, { published: -1 });

  for (const s of expired as Story[]) {
    const tombstone = {
      type: "Tombstone",
      id: `https://${domain}/objects/${s._id}`,
      formerType: Array.isArray(s.type) ? s.type[0] : s.type,
      deleted: new Date().toISOString(),
    };
    const activity = createDeleteActivity(
      domain,
      `https://${domain}/users/${s.attributedTo}`,
      tombstone,
    );
    await deliverToFollowers(env, s.attributedTo, activity, domain);
    await db.updateObject(String(s._id), {
      type: ["Tombstone"],
      deleted_at: new Date(),
    });
  }

  return expired.length;
}

// CORSミドルウェア
app.use(
  "/stories/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/stories", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const stories = await db.findObjects({
      type: { $in: ["x:Story"] },
      endTime: { $gt: new Date() },
    }, { published: -1 });

    const formatted = stories.map((s) => {
      const story = s as Story;
      return {
        id: String(story._id),
        author: story.attributedTo,
        content: story.content,
        mediaUrl: story.extra.mediaUrl,
        mediaType: story.extra.mediaType,
        backgroundColor: story.extra.backgroundColor,
        textColor: story.extra.textColor,
        createdAt: story.published,
        endTime: story.endTime,
        overlays: story["x:overlays"],
        rev: story["x:rev"],
        views: story.extra.views,
      };
    });
    return c.json(formatted);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return c.json({ error: "Failed to fetch stories" }, 500);
  }
});

// ストーリー作成
app.post("/stories", async (c) => {
  try {
    const body = await c.req.json();
    const {
      author,
      content,
      mediaUrl,
      mediaType,
      backgroundColor,
      textColor,
    } = body;
    const overlays = Array.isArray(body["x:overlays"])
      ? body["x:overlays"]
      : [];

    if (!author || !content) {
      return c.json({ error: "Author and content are required" }, 400);
    }

    // 24時間後に期限切れ
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);

    const env = getEnv(c);
    const domain = env["ACTIVITYPUB_DOMAIN"] ?? "";
    const db = createDB(env);
    const story = await db.saveObject(
      {
        _id: createObjectId(domain),
        type: [
          mediaType && mediaType.startsWith("video") ? "Video" : "Image",
          "x:Story",
        ],
        "x:story": true,
        "x:overlays": overlays,
        "x:rev": 0,
        endTime,
        attributedTo: author,
        content,
        published: new Date(),
        extra: {
          mediaUrl,
          mediaType,
          backgroundColor: backgroundColor || "#1DA1F2",
          textColor: textColor || "#FFFFFF",
          views: 0,
        },
        actor_id: `https://${domain}/users/${author}`,
        aud: { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [] },
      },
    ) as Story;
    const storyObject = {
      id: `https://${domain}/objects/${story._id}`,
      type: story.type,
      attributedTo: `https://${domain}/users/${author}`,
      content: story.content,
      published: story.published instanceof Date
        ? story.published.toISOString()
        : story.published,
      endTime: story.endTime instanceof Date
        ? story.endTime.toISOString()
        : story.endTime,
      ...story.extra,
      "x:overlays": story["x:overlays"],
      "x:rev": story["x:rev"],
    };
    const activity = createCreateActivity(
      domain,
      `https://${domain}/users/${author}`,
      storyObject,
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
      endTime: story.endTime,
      overlays: story["x:overlays"],
      rev: story["x:rev"],
      views: story.extra.views,
    }, 201);
  } catch (error) {
    console.error("Error creating story:", error);
    return c.json({ error: "Failed to create story" }, 500);
  }
});

// ストーリー閲覧
app.post("/stories/:id/view", async (c) => {
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
      endTime: story.endTime,
      overlays: story["x:overlays"],
      rev: story["x:rev"],
      views: story.extra.views,
    });
  } catch (error) {
    console.error("Error viewing story:", error);
    return c.json({ error: "Failed to view story" }, 500);
  }
});

// ストーリー削除
app.delete("/stories/:id", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const id = c.req.param("id");
    const story = await db.deleteObject(id);

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    return c.json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Error deleting story:", error);
    return c.json({ error: "Failed to delete story" }, 500);
  }
});

// 期限切れストーリーのクリーンアップ（定期実行用）
app.delete("/stories/cleanup", async (c) => {
  try {
    const env = getEnv(c);
    const count = await cleanupExpiredStories(env);
    return c.json({
      message: "Cleanup completed",
      deletedCount: count,
    });
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
    return c.json({ error: "Failed to cleanup expired stories" }, 500);
  }
});

export default app;
