import { Hono } from "hono";
import { loadConfig } from "../shared/config.ts";
import { createTakosApp } from "../api/server.ts";
import { connectDatabase } from "../shared/db.ts";
import { ensureTenant } from "../api/services/tenant.ts";
import { createDB } from "../api/DB/mod.ts";
import Instance from "./models/instance.ts";
import { createConsumerApp } from "./consumer.ts";
import { createAuthApp } from "./auth.ts";
import oauthApp from "./oauth.ts";
import { serveStatic } from "hono/deno";
import type { Context } from "hono";
import { createRootActivityPubApp } from "./root_activitypub.ts";
import { createServiceActorApp } from "./service_actor.ts";
import { logger } from "hono/logger";
import { takosEnv } from "./takos_env.ts";
import { dirname, fromFileUrl, join } from "@std/path";
import { getEnvPath } from "../shared/args.ts";

const FCM_KEYS = [
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "FIREBASE_VAPID_KEY",
];

async function loadTextFile(
  path: string | URL,
  label: string,
): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    console.error(`${label} ${path} を読み込めませんでした`);
    return "";
  }
}
// コマンドライン引数から .env のパスを取得
const envPath = getEnvPath();
const defaultEnvPath = join(dirname(fromFileUrl(import.meta.url)), ".env");
const hostEnv = await loadConfig({ envPath: envPath ?? defaultEnvPath });

hostEnv["DB_MODE"] = "host";
await connectDatabase(hostEnv);

const apps = new Map<string, Hono>();
const rootDomain =
  (hostEnv["ROOT_DOMAIN"] ?? hostEnv["ACTIVITYPUB_DOMAIN"] ?? "")
    .toLowerCase();
const rootActivityPubApp = rootDomain
  ? createRootActivityPubApp({ ...takosEnv, ACTIVITYPUB_DOMAIN: rootDomain })
  : null;
const freeLimit = Number(hostEnv["FREE_PLAN_LIMIT"] ?? "1");
const reservedSubdomains = (hostEnv["RESERVED_SUBDOMAINS"] ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.length > 0);
const termsPath = hostEnv["TERMS_FILE"];
const termsText = termsPath ? await loadTextFile(termsPath, "TERMS_FILE") : "";
const notFoundHtml = await loadTextFile(
  new URL("./404.html", import.meta.url),
  "404.html",
);
const consumerApp = createConsumerApp(
  (host) => {
    apps.delete(host);
  },
  { rootDomain, freeLimit, reservedSubdomains },
);
const authApp = createAuthApp({ rootDomain, termsRequired: !!termsText });
const isDev = Deno.env.get("DEV") === "1";
const serviceActorApp = createServiceActorApp({
  ...takosEnv,
  ACTIVITYPUB_DOMAIN: rootDomain,
});

/**
 * ホスト名部分のみを取り出すユーティリティ
 */
function parseHost(value: string | undefined): string {
  return value?.split(":")[0].toLowerCase() ?? "";
}

/**
 * リバースプロキシ環境下で実際のホストを取得する
 */
function getRealHost(c: Context): string {
  const forwarded = c.req.header("x-forwarded-host");
  const hostHeader = c.req.header("host");
  let host = forwarded?.split(",")[0].trim() || hostHeader;
  if (!host) {
    try {
      host = new URL(c.req.url).host;
    } catch (_e) {
      // ignore
    }
  }
  if (!host) {
    console.warn("Host header missing:", { forwarded, hostHeader });
    return "localhost";
  }
  return parseHost(host);
}

/**
 * 開発環境でフロントエンドをプロキシするミドルウェア
 */
const proxy =
  (prefix: string) => async (c: Context, next: () => Promise<void>) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      await next();
      return;
    }
    const path = c.req.path.replace(new RegExp(`^${prefix}`), "");
    const url = `http://localhost:1421${path}`;
    const res = await fetch(url);
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: res.headers });
  };

/**
 * サブドメインに対応する環境変数を取得する
 */
async function getEnvForHost(
  host: string,
): Promise<Record<string, string> | null> {
  host = parseHost(host);
  const baseEnv: Record<string, string> = {
    ...takosEnv,
  };
  for (const k of FCM_KEYS) {
    if (hostEnv[k]) baseEnv[k] = hostEnv[k];
  }
  if (rootDomain && host === rootDomain) {
    return { ...baseEnv, ACTIVITYPUB_DOMAIN: rootDomain };
  }
  const inst = await Instance.findOne({ host }).lean();
  if (!inst || Array.isArray(inst)) return null;
  return { ...baseEnv, ...inst.env, ACTIVITYPUB_DOMAIN: host };
}

/**
 * サブドメイン用のアプリを動的に生成する
 */
async function getAppForHost(host: string): Promise<Hono | null> {
  host = parseHost(host);
  let app = apps.get(host);
  if (app) return app;
  const appEnv = await getEnvForHost(host);
  if (!appEnv) return null;
  const db = createDB(hostEnv);
  await ensureTenant(db, host, host);
  app = await createTakosApp(appEnv);
  apps.set(host, app);
  return app;
}

const root = new Hono();

root.route("/auth", authApp);
root.route("/oauth", oauthApp);
root.route("/user", consumerApp);
if (termsText) {
  root.get("/terms", () =>
    new Response(termsText, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    }));
}

if (isDev) {
  root.use("/@vite/*", proxy(""));
  root.use("/src/*", proxy(""));
  root.use("/manifest.json", proxy(""));
  root.use("/auth/*", proxy("/auth"));
  root.use("/user/*", proxy("/user"));
  if (rootDomain && rootActivityPubApp) {
    root.use(async (c, next) => {
      const host = getRealHost(c);
      if (host === rootDomain) {
        let res = await rootActivityPubApp.fetch(c.req.raw);
        if (res.status !== 404) {
          return res;
        }
        res = await serviceActorApp.fetch(c.req.raw);
        if (res.status !== 404) {
          return res;
        }
      }
      await next();
    });
  }
} else {
  root.use(
    "/auth/*",
    serveStatic({
      root: "./client/dist",
      rewriteRequestPath: (path) => path.replace(/^\/auth/, ""),
    }),
  );
  root.use(
    "/user/*",
    serveStatic({
      root: "./client/dist",
      rewriteRequestPath: (path) => path.replace(/^\/user/, ""),
    }),
  );
}

root.all("/*", async (c) => {
  const host = getRealHost(c);
  if (rootDomain && host === rootDomain) {
    if (rootActivityPubApp) {
      const res = await rootActivityPubApp.fetch(c.req.raw);
      if (res.status !== 404) {
        return res;
      }
    }
    const res = await serviceActorApp.fetch(c.req.raw);
    if (res.status !== 404) {
      return res;
    }
    if (c.req.method === "GET" || c.req.method === "HEAD") {
      const path = c.req.path;
      const redirectTargets = [
        "/api",
        "/fasp",
        "/auth",
        "/oauth",
        "/.well-known",
      ];
      if (!redirectTargets.some((p) => path.startsWith(p))) {
        return c.redirect(`/user${path}`);
      }
    }
    if (notFoundHtml) {
      return new Response(notFoundHtml, {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return c.text("not found", 404);
  }
  const app = await getAppForHost(host);
  if (!app) {
    if (c.req.method === "GET" || c.req.method === "HEAD") {
      const path = c.req.path;
      const redirectTargets = [
        "/api",
        "/fasp",
        "/auth",
        "/oauth",
        "/.well-known",
      ];
      if (!redirectTargets.some((p) => path.startsWith(p))) {
        return c.redirect(`/user${path}`);
      }
    }
    if (notFoundHtml) {
      return new Response(notFoundHtml, {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return c.text("not found", 404);
  }
  const res = await app.fetch(c.req.raw);
  if (
    res.status === 404 &&
    (c.req.method === "GET" || c.req.method === "HEAD")
  ) {
    const path = c.req.path;
    const redirectTargets = [
      "/api",
      "/fasp",
      "/auth",
      "/oauth",
      "/.well-known",
    ];
    if (!redirectTargets.some((p) => path.startsWith(p))) {
      return c.redirect(`/user${path}`);
    }
  }
  return res;
});

root.use(logger());
const hostname = hostEnv["SERVER_HOST"];
// サーバーのポート番号 (未指定時は 80)
const port = Number(hostEnv["SERVER_PORT"] ?? "80");

const certFile = hostEnv["SERVER_CERT_FILE"];
const keyFile = hostEnv["SERVER_KEY_FILE"];

if (certFile && keyFile) {
  try {
    const moduleDir = dirname(fromFileUrl(import.meta.url));
    const projectRoot = join(moduleDir, "..", "..");
    const cert = await Deno.readTextFile(
      join(
        projectRoot,
        certFile.startsWith("../") ? certFile.substring(3) : certFile,
      ),
    );
    const key = await Deno.readTextFile(
      join(
        projectRoot,
        keyFile.startsWith("../") ? keyFile.substring(3) : keyFile,
      ),
    );
    // hostname を追加
    Deno.serve({ hostname, port, cert, key }, root.fetch);
  } catch (e) {
    console.error("SSL証明書を読み込めませんでした:", e);
    Deno.serve({ hostname, port }, root.fetch);
  }
} else {
  Deno.serve({ hostname, port }, root.fetch);
}
