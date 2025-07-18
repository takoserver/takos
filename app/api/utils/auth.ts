import { MiddlewareHandler } from "hono";
import SessionRepository from "../repositories/session_repository.ts";
import { getEnv } from "../../shared/config.ts";
import { createAuthMiddleware } from "../../shared/auth.ts";

const sessionRepo = new SessionRepository();

const authRequired: MiddlewareHandler = createAuthMiddleware({
  cookieName: "sessionId",
  errorMessage: "認証が必要です",
  findSession: async (sid, c) => {
    const env = getEnv(c);
    return await sessionRepo.findOne({
      sessionId: sid,
      tenant_id: env["ACTIVITYPUB_DOMAIN"],
    });
  },
  deleteSession: async (sid, c) => {
    const env = getEnv(c);
    await sessionRepo.delete({
      sessionId: sid,
      tenant_id: env["ACTIVITYPUB_DOMAIN"],
    });
  },
  updateSession: async (session, expires) => {
    const sid = (session as unknown as { sessionId: string }).sessionId;
    await sessionRepo.updateOne({ sessionId: sid }, { expiresAt: expires });
  },
});

export default authRequired;
