import { Hono } from "hono";
import { getEnv } from "./utils/env_store.ts";

const app = new Hono();

app.post("/oauth/token", async (c) => {
  const { code } = await c.req.json();
  if (!code || typeof code !== "string") {
    return c.json({ error: "code_required" }, 400);
  }
  const env = getEnv(c);
  const host = env["OAUTH_HOST"] ?? env["ROOT_DOMAIN"];
  const clientId = env["OAUTH_CLIENT_ID"];
  const clientSecret = env["OAUTH_CLIENT_SECRET"];
  if (!host || !clientId || !clientSecret) {
    return c.json({ error: "server_not_configured" }, 500);
  }
  const base = host.startsWith("http") ? host : `https://${host}`;
  const redirect = new URL(c.req.url).origin;
  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("code", code);
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("redirect_uri", redirect);
  try {
    const res = await fetch(`${base}/oauth/token`, {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    if (!res.ok) return c.json(data, res.status);
    return c.json(data);
  } catch (err) {
    console.error("OAuth token fetch failed:", err);
    return c.json({ error: "token_request_failed" }, 500);
  }
});

export default app;
