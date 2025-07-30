import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import { createObjectId } from "../utils/activitypub.ts";
import { getEnv } from "../../shared/config.ts";

/** ストーリーオブジェクト型定義
 *  単一 item を保持する構造
 */
type Story = {
  _id: { toString(): string };
  attributedTo: string;
  published: string | Date;
  extra: {
    story: unknown;
    expiresAt?: string | Date;
    views?: number;
  };
};

const app = new Hono();
app.use("/stories/*", authRequired);

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
      type: "Story",
      "extra.expiresAt": { $gt: new Date() },
    }, { published: -1 });

    const formatted = stories.map((s) => {
      const story = s as Story;
      return {
        id: String(story._id),
        author: story.attributedTo,
        createdAt: story.published,
        expiresAt: story.extra.expiresAt,
        views: story.extra.views,
        ...(story.extra.story as Record<string, unknown>),
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
    const storyData = await c.req.json();
    const { author, id: _discard, ...storyBody } = storyData as {
      author?: string;
      id?: string;
      // deno-lint-ignore no-explicit-any
      [key: string]: any;
    };

    if (!author) {
      return c.json({ error: "Author is required" }, 400);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const env = getEnv(c);
    const domain = env["ACTIVITYPUB_DOMAIN"] ?? "";
    const db = createDB(env);
    const story = await db.saveObject(
      {
        _id: createObjectId(domain),
        type: "Story",
        attributedTo: author,
        published: new Date(),
        extra: {
          story: storyBody,
          expiresAt,
          views: 0,
        },
        actor_id: `https://${domain}/users/${author}`,
        aud: { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [] },
      },
    ) as Story;
    return c.json({
      id: String(story._id),
      author: story.attributedTo,
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      views: story.extra.views,
      ...(storyBody as Record<string, unknown>),
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
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      views: story.extra.views,
      ...(story.extra.story as Record<string, unknown>),
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
