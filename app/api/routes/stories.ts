import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDB } from "../DB/mod.ts";
import authRequired from "../utils/auth.ts";
import {
  buildActivityFromStored,
  createCreateActivity,
  createDeleteActivity,
  createObjectId,
  deliverActivityPubObject,
  fetchActorInbox,
  getDomain,
} from "../utils/activitypub.ts";
import { getEnv } from "../../shared/config.ts";

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
    views?: number;
  };
  endTime?: string | Date;
  x_overlays?: unknown[];
  x_rev?: number;
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
    const { author, content, mediaUrl, mediaType, backgroundColor, textColor } =
      body;
    const overlays = body["x:overlays"];
    const xRev = body["x:rev"];

    if (!author || !content) {
      return c.json({ error: "Author and content are required" }, 400);
    }

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);

    const env = getEnv(c);
    const domain = getDomain(c);
    const db = createDB(env);
    const story = await db.saveObject(
      {
        _id: createObjectId(domain),
        type: [
          typeof mediaType === "string" && mediaType.startsWith("video")
            ? "Video"
            : "Image",
          "x:Story",
        ],
        attributedTo: author,
        content,
        published: new Date(),
        endTime,
        x_overlays: Array.isArray(overlays) ? overlays : [],
        ...(typeof xRev === "number" ? { x_rev: xRev } : {}),
        extra: {
          mediaUrl,
          mediaType,
          backgroundColor: backgroundColor || "#1DA1F2",
          textColor: textColor || "#FFFFFF",
          expiresAt: endTime,
          views: 0,
        },
        actor_id: `https://${domain}/users/${author}`,
        aud: { to: ["https://www.w3.org/ns/activitystreams#Public"], cc: [] },
      },
    ) as Story;
    const baseObj = story as Record<string, unknown>;
    const activityObj = buildActivityFromStored(
      {
        ...baseObj,
        type: baseObj.type ?? "Story",
        published: story.published,
        extra: baseObj.extra ?? {},
      },
      domain,
      author,
      false,
    ) as Record<string, unknown>;
    activityObj.endTime = story.endTime;
    if (story.x_overlays && story.x_overlays.length > 0) {
      activityObj["x:overlays"] = story.x_overlays;
    }
    if (typeof story.x_rev === "number") {
      activityObj["x:rev"] = story.x_rev;
    }
    const createActivity = createCreateActivity(
      domain,
      `https://${domain}/users/${author}`,
      activityObj,
    );
    const account = await db.findAccountByUserName(author);
    if (account && Array.isArray(account.followers)) {
      const inboxes = await Promise.all(
        account.followers.map(async (actorUrl: string) => {
          try {
            const url = new URL(actorUrl);
            if (
              url.hostname === domain && url.pathname.startsWith("/users/")
            ) {
              return null;
            }
            return await fetchActorInbox(actorUrl, env);
          } catch {
            return null;
          }
        }),
      );
      const valid = inboxes.filter((i): i is string =>
        typeof i === "string" && i
      );
      if (valid.length > 0) {
        deliverActivityPubObject(valid, createActivity, author, domain, env)
          .catch(
            (err) => {
              console.error("Failed to deliver story:", err);
            },
          );
      }
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
    const story = await db.deleteObject(id) as Story | null;

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    return c.json({
      id: String((story as Story)._id),
      author: story.attributedTo,
      content: story.content,
      mediaUrl: (story as Story).extra.mediaUrl,
      mediaType: (story as Story).extra.mediaType,
      backgroundColor: (story as Story).extra.backgroundColor,
      textColor: (story as Story).extra.textColor,
      createdAt: story.published,
      endTime: story.endTime,
      views: (story as Story).extra.views,
    });
  } catch (error) {
    console.error("Error deleting story:", error);
    return c.json({ error: "Failed to delete story" }, 500);
  }
});

// 期限切れストーリーのクリーンアップ（定期実行用）
app.delete("/stories/cleanup", async (c) => {
  try {
    const env = getEnv(c);
    const domain = getDomain(c);
    const db = createDB(env);
    const now = new Date();
    const expired = await db.findObjects({
      type: "Story",
      endTime: { $lt: now },
    });
    const deletedStories: Story[] = [];
    for (const s of expired) {
      const st = s as Story;
      const delAct = createDeleteActivity(
        domain,
        `https://${domain}/users/${st.attributedTo}`,
        {
          type: "Tombstone",
          id: `https://${domain}/objects/${st._id}`,
          formerType: Array.isArray(st.type) ? st.type[0] : st.type,
          deleted: now.toISOString(),
        },
      );
      const account = await db.findAccountByUserName(st.attributedTo);
      if (account && Array.isArray(account.followers)) {
        const inboxes = await Promise.all(
          account.followers.map(async (actorUrl: string) => {
            try {
              const url = new URL(actorUrl);
              if (
                url.hostname === domain && url.pathname.startsWith("/users/")
              ) {
                return null;
              }
              return await fetchActorInbox(actorUrl, env);
            } catch {
              return null;
            }
          }),
        );
        const valid = inboxes.filter((i): i is string =>
          typeof i === "string" && i
        );
        if (valid.length > 0) {
          await deliverActivityPubObject(
            valid,
            delAct,
            st.attributedTo,
            domain,
            env,
          ).catch(
            (err) => console.error("Failed to deliver delete story:", err),
          );
        }
      }
      await db.deleteObject(String(st._id));
      deletedStories.push(st);
    }

    return c.json({
      deletedCount: deletedStories.length,
      deleted: deletedStories.map((story) => ({
        id: String(story._id),
        author: story.attributedTo,
        content: story.content,
        mediaUrl: story.extra.mediaUrl,
        mediaType: story.extra.mediaType,
        backgroundColor: story.extra.backgroundColor,
        textColor: story.extra.textColor,
        createdAt: story.published,
        endTime: story.endTime,
        views: story.extra.views,
      })),
    });
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
    return c.json({ error: "Failed to cleanup expired stories" }, 500);
  }
});

export default app;
