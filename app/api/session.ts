import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import SessionRepository from "./repositories/session_repository.ts";
import authRequired from "./utils/auth.ts";

const app = new Hono();
const sessionRepo = new SessionRepository();
app.use("/session/*", authRequired);

app.get("/session/status", async (c) => {
  const sessionId = getCookie(c, "sessionId");
  if (!sessionId) {
    return c.json({ login: false });
  }

  try {
    const session = await sessionRepo.findOne({ sessionId });
    if (session && session.expiresAt > new Date()) {
      return c.json({ login: true });
    } else {
      if (session) {
        // Clean up expired session
        await sessionRepo.delete({ sessionId });
      }
      return c.json({ login: false });
    }
  } catch (error) {
    console.error("Session status check failed:", error);
    return c.json({ login: false, error: "Server error" }, 500);
  }
});

export default app;
