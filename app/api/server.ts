import { Hono } from "hono";
import { connectDatabase } from "../shared/db.ts";
import { initEnv, loadConfig } from "../shared/config.ts";
import login from "./routes/login.ts";
import logout from "./routes/logout.ts";
import setupUI from "./routes/setup_ui.ts";
import session from "./routes/session.ts";
import accounts from "./routes/accounts.ts";
import notifications from "./routes/notifications.ts";
import activitypub from "./routes/activitypub.ts";
import posts from "./routes/posts.ts";
import search from "./routes/search.ts";
import users from "./routes/users.ts";
import follow from "./routes/follow.ts";
import groups from "./routes/groups.ts";
import rootInbox from "./routes/root_inbox.ts";
import nodeinfo from "./routes/nodeinfo.ts";
import e2ee from "./routes/e2ee.ts";
import fasp from "./routes/fasp.ts";
import videos, {
  initVideoModule,
  initVideoWebSocket,
} from "./routes/videos.ts";
import files, { initFileModule } from "./routes/files.ts";
import wsRouter from "./routes/ws.ts";
import config from "./routes/config.ts";
import fcm from "./routes/fcm.ts";
import placeholder from "./routes/placeholder.ts";
import trends from "./routes/trends.ts";
import { fetchOgpData } from "./services/ogp.ts";
import { serveStatic } from "hono/deno";
import type { Context } from "hono";
import { rateLimit } from "./utils/rate_limit.ts";

const isDev = Deno.env.get("DEV") === "1";

export async function createTakosApp(env?: Record<string, string>) {
  const e = env ?? await loadConfig();

  const app = new Hono();
  initEnv(app, e);
  app.use("/api/*", async (c, next) => {
    if (c.req.path === "/api/ws") {
      await next();
      return;
    }
    const rl = rateLimit({ windowMs: 60_000, limit: 100 });
    await rl(c, next);
  });
  await initFileModule(e);
  await initVideoModule(e);
  initVideoWebSocket();

  const apiRoutes = [
    wsRouter,
    login,
    logout,
    session,
    accounts,
    follow,
    notifications,
    posts,
    config,
    fcm,
    setupUI,
    placeholder,
    trends,
    videos,
    groups,
    files,
    search,
    users,
    e2ee,
  ];
  for (const r of apiRoutes) {
    app.route("/api", r);
  }

  // ActivityPub ルートは / のみにマウントする

  const rootRoutes = [nodeinfo, activitypub, rootInbox, fasp];
  // e2ee ルートは /api のみで提供し、ActivityPub ルートと競合しないようにする
  for (const r of rootRoutes) {
    app.route("/", r);
  }

  app.get("/api/ogp", async (c) => {
    const url = c.req.query("url");
    if (!url) {
      return c.json({ error: "URL parameter is required" }, 400);
    }
    const ogpData = await fetchOgpData(url);
    if (ogpData) {
      return c.json(ogpData);
    } else {
      return c.json({ error: "Failed to fetch OGP data" }, 500);
    }
  });
  function proxy() {
    return async (c: Context, next: () => Promise<void>) => {
      if (c.req.method !== "GET" && c.req.method !== "HEAD") {
        await next();
        return;
      }
      const url = `http://localhost:1420${c.req.path}`;
      const res = await fetch(url);
      const body = await res.arrayBuffer();
      return new Response(body, { status: res.status, headers: res.headers });
    };
  }

  if (isDev) {
    app.use("/*", proxy());
  } else {
    app.use(
      "/*",
      serveStatic({
        root: "../client/dist",
        onNotFound: async (_path, c) => {
          await serveStatic({ root: "../client/dist", path: "index.html" })(
            c,
            async () => {},
          );
        },
      }),
    );
  }

  return app;
}

if (import.meta.main) {
  const env = await loadConfig();
  await connectDatabase(env);
  const app = await createTakosApp(env);
  const hostname = env["SERVER_HOST"];
  const port = Number(env["SERVER_PORT"] ?? "80");
  const certFile = env["SERVER_CERT_FILE"];
  const keyFile = env["SERVER_KEY_FILE"];

  // Deno.serve のオプションは top-level に port, hostname を直接渡す
  // TLS の場合は cert/key を追加で渡す
  // Deno.serve は options として { hostname, port, cert, key } を受け取るが、
  // 型名はバージョンにより変動するため型注釈を外して実行時に渡す。
  const options = {
    hostname,
    port,
    cert: certFile ? await Deno.readTextFile(certFile) : undefined,
    key: keyFile ? await Deno.readTextFile(keyFile) : undefined,
  };

  Deno.serve(options, app.fetch);
}
