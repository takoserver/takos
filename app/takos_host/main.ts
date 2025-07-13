import { Hono } from "hono";
import { load } from "jsr:@std/dotenv";
import { createTakosApp } from "../api/server.ts";
import { connectDatabase } from "../api/db.ts";
import Instance from "./models/instance.ts";
import { createAdminApp } from "./admin.ts";
import { authApp } from "./auth.ts";

const env = await load();
await connectDatabase(env);

const apps = new Map<string, Hono>();
const adminApp = createAdminApp();
const rootDomain = env["ROOT_DOMAIN"] ?? "";

async function getEnvForHost(
  host: string,
): Promise<Record<string, string> | null> {
  const inst = await Instance.findOne({ host }).lean();
  if (!inst) return null;
  return { ...env, ...inst.env, ACTIVITYPUB_DOMAIN: host };
}

async function getAppForHost(host: string): Promise<Hono | null> {
  let app = apps.get(host);
  if (app) return app;
  const hostEnv = await getEnvForHost(host);
  if (!hostEnv) return null;
  app = await createTakosApp(hostEnv);
  apps.set(host, app);
  return app;
}

const root = new Hono();
root.route("/auth", authApp);
root.route("/admin", adminApp);

root.all("/*", async (c) => {
  const host = c.req.header("host") ?? "";
  if (rootDomain && host === rootDomain) {
    return authApp.fetch(c.req.raw);
  }
  const app = await getAppForHost(host);
  if (!app) return c.text("not found", 404);
  return app.fetch(c.req.raw);
});

Deno.serve(root.fetch);
