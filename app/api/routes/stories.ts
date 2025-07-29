import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import { createObjectId } from "../utils/activitypub.ts";
import { getEnv } from "../../shared/config.ts";

/** StoryElement 型定義 */
export interface StoryElement {
  type: "Image" | "Video" | "Text";
  mediaUrl?: string;
  mediaType?: string;
  text?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  start: number;
  duration: number;
}

/** ストーリーオブジェクト型定義 */
type Story = {
  _id: { toString(): string };
  attributedTo: string;
  published: string | Date;
  extra: {
    elements: StoryElement[];
    backgroundColor?: string;
    textColor?: string;
    expiresAt?: string | Date;
    viewCount?: number;
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

// ストーリー一覧取得
app.get("/api/stories", async (c) => {
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
        elements: story.extra.elements,
        backgroundColor: story.extra.backgroundColor,
        textColor: story.extra.textColor,
        createdAt: story.published,
        expiresAt: story.extra.expiresAt,
        viewCount: story.extra.viewCount,
      };
    });
    return c.json(formatted);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return c.json({ error: "Failed to fetch stories" }, 500);
  }
});

// ストーリー作成
app.post(
  "/stories",
  zValidator(
    "json",
    z.object({
      author: z.string(),
      elements: z.array(
        z.object({
          type: z.union([
            z.literal("Image"),
            z.literal("Video"),
            z.literal("Text"),
          ]),
          mediaUrl: z.string().url().optional(),
          mediaType: z.string().optional(),
          text: z.string().optional(),
          color: z.string().optional(),
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          width: z.number().min(0).max(1),
          height: z.number().min(0).max(1),
          start: z.number().min(0),
          duration: z.number().min(0),
        }),
      ),
      backgroundColor: z.string().optional(),
      textColor: z.string().optional(),
    }),
  ),
  async (c) => {
    try {
      const {
        author,
        elements,
        backgroundColor,
        textColor,
      } = c.req.valid("json") as {
        author: string;
        elements: StoryElement[];
        backgroundColor?: string;
        textColor?: string;
      };

      // 24時間後に期限切れ
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
            elements,
            backgroundColor: backgroundColor || "#1DA1F2",
            textColor: textColor || "#FFFFFF",
            expiresAt,
            viewCount: 0,
          },
          actor_id: `https://${domain}/users/${author}`,
          aud: { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [] },
        },
      ) as Story;
      return c.json({
        id: String(story._id),
        author: story.attributedTo,
        elements: story.extra.elements,
        backgroundColor: story.extra.backgroundColor,
        textColor: story.extra.textColor,
        createdAt: story.published,
        expiresAt: story.extra.expiresAt,
        viewCount: story.extra.viewCount,
      }, 201);
    } catch (error) {
      console.error("Error creating story:", error);
      return c.json({ error: "Failed to create story" }, 500);
    }
  },
);

// ストーリー閲覧
app.post("/stories/:id/view", async (c) => {
  try {
    const env = getEnv(c);
    const db = createDB(env);
    const id = c.req.param("id");
    const story = await db.updateObject(id, {
      $inc: { "extra.viewCount": 1 },
    }) as Story | null;

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    return c.json({
      id: String(story._id),
      author: story.attributedTo,
      elements: story.extra.elements,
      backgroundColor: story.extra.backgroundColor,
      textColor: story.extra.textColor,
      createdAt: story.published,
      expiresAt: story.extra.expiresAt,
      viewCount: story.extra.viewCount,
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
