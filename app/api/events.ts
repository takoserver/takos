import { Hono } from "hono";
import { upgradeWebSocket } from "hono/deno";
import { extname } from "@std/path";
import { createStorage } from "./services/object-storage.ts";
import ActivityPubObject from "./models/activitypub_object.ts";
import Account from "./models/account.ts";
import authRequired from "./utils/auth.ts";
import {
  buildActivityFromStored,
  createCreateActivity,
  deliverActivityPubObject,
  fetchActorInbox,
  getDomain,
} from "./utils/activitypub.ts";

const connections = new Map<string, Set<WebSocket>>();
const uploadStates = new Map<WebSocket, {
  chunks: Uint8Array[];
  metadata: {
    author: string;
    title: string;
    description: string;
    hashtagsStr: string;
    isShort: boolean;
    duration: string;
    originalName: string;
  };
  storageKey: string;
  domain: string;
}>();

const storage = createStorage();

async function deliverVideoToFollowers(
  video: InstanceType<typeof ActivityPubObject> & {
    toObject: () => Record<string, unknown>;
  },
  author: string,
  domain: string,
) {
  try {
    const account = await Account.findOne({ userName: author }).lean();
    if (!account || !account.followers) return;

    const inboxes = await Promise.all(
      account.followers.map(async (followerUrl) => {
        try {
          const url = new URL(followerUrl);
          if (url.host === domain && url.pathname.startsWith("/users/")) {
            return null;
          }
          return await fetchActorInbox(followerUrl);
        } catch {
          return null;
        }
      }),
    );

    const validInboxes = inboxes.filter((i): i is string =>
      typeof i === "string" && !!i
    );

    if (validInboxes.length > 0) {
      const baseObj = video.toObject();
      const videoObject = buildActivityFromStored(
        {
          ...baseObj,
          content: typeof video.content === "string" ? video.content : "",
          _id: String(baseObj._id),
          type: typeof baseObj.type === "string" ? baseObj.type : "Video",
          published: typeof baseObj.published === "string"
            ? baseObj.published
            : new Date().toISOString(),
          extra: (typeof baseObj.extra === "object" && baseObj.extra !== null &&
              !Array.isArray(baseObj.extra))
            ? baseObj.extra as Record<string, unknown>
            : {},
        },
        domain,
        author,
        false,
      );
      const activity = createCreateActivity(
        domain,
        `https://${domain}/users/${author}`,
        videoObject,
      );
      deliverActivityPubObject(validInboxes, activity, author);
    }
  } catch (err) {
    console.error("ActivityPub delivery error:", err);
  }
}

export function broadcastEvent(
  targets: string[],
  event: string,
  payload: unknown,
) {
  const data = JSON.stringify({ event, data: payload });
  for (const t of targets) {
    const set = connections.get(t);
    if (!set) continue;
    for (const ws of set) {
      try {
        ws.send(data);
      } catch (err) {
        console.error("WebSocket send failed", err);
      }
    }
  }
}

const eventWs = upgradeWebSocket((c) => {
  const domain = getDomain(c);
  let user: string | null = null;
  let socket: WebSocket;
  return {
    onOpen(_evt, ws) {
      socket = ws;
    },
    onMessage(evt, ws) {
      if (typeof evt.data === "string") {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "subscribe" && typeof msg.user === "string") {
            user = msg.user;
            const set = connections.get(user) ?? new Set<WebSocket>();
            set.add(socket);
            connections.set(user, set);
          } else if (msg.type === "video-upload" && msg.payload) {
            const meta = msg.payload as {
              author: string;
              title: string;
              description: string;
              hashtagsStr: string;
              isShort: boolean;
              duration: string;
              originalName: string;
            };
            if (!meta.originalName) {
              ws.close(1003, "Invalid metadata");
              return;
            }
            const ext = extname(meta.originalName) || ".mp4";
            const key = `${crypto.randomUUID()}${ext}`;
            uploadStates.set(ws, {
              chunks: [],
              metadata: meta,
              storageKey: key,
              domain,
            });
            ws.send(JSON.stringify({ status: "ready for binary" }));
          }
        } catch (_err) {
          // ignore
        }
      } else if (evt.data instanceof ArrayBuffer) {
        const state = uploadStates.get(ws);
        if (state) {
          state.chunks.push(new Uint8Array(evt.data));
        }
      }
    },
    async onClose(_evt, ws) {
      const state = uploadStates.get(ws);
      if (state) {
        if (state.chunks.length > 0) {
          const data = new Uint8Array(
            state.chunks.reduce((a, b) => a + b.length, 0),
          );
          let offset = 0;
          for (const cbuf of state.chunks) {
            data.set(cbuf, offset);
            offset += cbuf.length;
          }
          const stored = await storage.put(`videos/${state.storageKey}`, data);
          const videoUrl = stored.startsWith("http")
            ? stored
            : `/api/video-files/${state.storageKey}`;

          const video = new ActivityPubObject({
            type: "Video",
            attributedTo: state.metadata.author,
            content: state.metadata.description,
            published: new Date(),
            extra: {
              title: state.metadata.title,
              hashtags: state.metadata.hashtagsStr
                ? state.metadata.hashtagsStr.split(" ")
                : [],
              isShort: state.metadata.isShort,
              duration: state.metadata.duration || "",
              likes: 0,
              views: 0,
              thumbnail: `/api/placeholder/${
                state.metadata.isShort ? "225/400" : "400/225"
              }`,
              videoUrl,
            },
          });

          await video.save();
          deliverVideoToFollowers(video, state.metadata.author, state.domain);
        }
        uploadStates.delete(ws);
      }
      if (user) {
        const set = connections.get(user);
        if (set) {
          set.delete(socket);
          if (set.size === 0) connections.delete(user);
        }
      }
    },
    onError() {},
  };
});

const app = new Hono();
app.use("*", authRequired);
app.get("/ws", eventWs);

export default app;
