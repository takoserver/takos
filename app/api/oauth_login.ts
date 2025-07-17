import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { getEnv } from "./utils/env_store.ts";
import Session from "./models/session.ts";

const app = new Hono();

app.post("/oauth/login", async (c) => {
  const { accessToken, code } = await c.req.json();
  const env = getEnv(c);
  const host = env["OAUTH_HOST"] ?? env["ROOT_DOMAIN"];
  if (!host) {
    return c.json({ error: "Server configuration error" }, 500);
  }
  const url = host.startsWith("http") ? host : `https://${host}`;
  let token = accessToken as string | undefined;
  if (!token && code) {
    const clientId = env["OAUTH_CLIENT_ID"];
    const clientSecret = env["OAUTH_CLIENT_SECRET"];
    if (!clientId || !clientSecret) {
      return c.json({ error: "Server configuration error" }, 500);
    }
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: clientId,
    });
    const resp = await fetch(`${url}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!resp.ok) return c.json({ error: "invalid_code" }, 400);
    const data = await resp.json();
    token = data.access_token as string;
  }
  if (!token) return c.json({ error: "invalid_request" }, 400);
  const res = await fetch(`${url}/oauth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) return c.json({ error: "Invalid token" }, 401);
  const data = await res.json();
  if (!data.active) return c.json({ error: "Invalid token" }, 401);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = new Session({ sessionId, expiresAt });
  await session.save();
  setCookie(c, "sessionId", sessionId, {
    path: "/",
    httpOnly: true,
    secure: c.req.url.startsWith("https://"),
    expires: expiresAt,
    sameSite: "Lax",
  });
  return c.json({ success: true, message: "Login successful" });
});

export default app;
