import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { createDB } from "../DB/mod.ts";
import { getEnv } from "../../shared/config.ts";
import { sendToUser } from "./ws.ts";
import { getDomain } from "../utils/activitypub.ts";

const app = new Hono();

app.get("/session/status", async (c) => {
  const sessionId = getCookie(c, "sessionId");
  if (!sessionId) {
    return c.json({ login: false });
  }

  try {
    const env = getEnv(c);
    const db = createDB(env);
    const session = await db.findSessionById(sessionId);
    if (session && session.expiresAt > new Date()) {
      // Try to resolve device -> user mapping via EncryptedKeyPair
      try {
        const pair = await db.findEncryptedKeyPairByDevice(session.sessionId) as
          | { userName?: string }
          | null;
        if (pair && pair.userName) {
          const available = await db.countAvailableKeyPackages(pair.userName);
          const env2 = getEnv(c);
          const threshold = parseInt(env2["KP_LOW_THRESHOLD"] ?? "3", 10) || 3;
          // notify if low
          if (available <= threshold) {
            const domain = getDomain(c);
            sendToUser(`${pair.userName}@${domain}`, {
              type: "keyPackageLow",
              payload: { remaining: available, threshold },
            });
          }
          return c.json({ login: true, userName: pair.userName, keyPackageInventory: { available, threshold } });
        }
      } catch (err) {
        console.error("session inventory check failed", err);
      }
      return c.json({ login: true });
    } else {
      if (session) {
        // Clean up expired session
        await db.deleteSessionById(sessionId);
      }
      return c.json({ login: false });
    }
  } catch (error) {
    console.error("Session status check failed:", error);
    return c.json({ login: false, error: "Server error" }, 500);
  }
});

export default app;
