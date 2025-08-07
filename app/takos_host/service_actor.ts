import { Hono } from "hono";
import { createDB } from "../api/DB/mod.ts";
import { getSystemKey } from "../api/services/system_actor.ts";
import {
  deliverActivityPubObject,
  getDomain,
  jsonResponse,
} from "../api/utils/activitypub.ts";
import HostServiceActor from "../api/models/takos_host/service_actor.ts";

export function createServiceActorApp(env: Record<string, string>) {
  const app = new Hono();
  const rootDomain = env["ROOT_DOMAIN"] ?? "";

  app.use("/*", async (c, next) => {
    if (rootDomain && getDomain(c) !== rootDomain) {
      return jsonResponse(c, { error: "not found" }, 404);
    }
    await next();
  });

  app.get("/actor", async (c) => {
    const domain = getDomain(c);
    const db = createDB(env);
    const config = await db.getServiceActorConfig();
    if (!config.enabled) {
      return jsonResponse(c, { error: "disabled" }, 404);
    }
    const { publicKey } = await getSystemKey(db, domain);
    const actorUrl = config.actorUrl || `https://${domain}/actor`;
    const actor = {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      id: actorUrl,
      type: config.type ?? "Service",
      preferredUsername: "takos",
      inbox: `https://${domain}/inbox`,
      outbox: `https://${domain}/outbox`,
      publicKey: {
        id: `${actorUrl}#main-key`,
        owner: actorUrl,
        publicKeyPem: publicKey,
      },
    };
    return jsonResponse(c, actor, 200, "application/activity+json");
  });

  app.post("/inbox", async (c) => {
    const domain = getDomain(c);
    const db = createDB(env);
    const config = await db.getServiceActorConfig();
    const actorUrl = config.actorUrl || `https://${domain}/actor`;
    const body = await c.req.json().catch(() => undefined);

    if (body?.type === "Follow" && body.object === actorUrl) {
      await HostServiceActor.updateOne({}, {
        $addToSet: { followers: body.actor },
      });
      const accept = {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${actorUrl}/accept/${crypto.randomUUID()}`,
        type: "Accept",
        actor: actorUrl,
        object: body,
      };
      await deliverActivityPubObject(
        [body.actor],
        accept,
        "system",
        domain,
        env,
      ).catch(
        () => {},
      );
    } else if (
      body?.type === "Undo" &&
      body.object?.type === "Follow" &&
      body.object.object === actorUrl
    ) {
      await HostServiceActor.updateOne({}, {
        $pull: { followers: body.object.actor },
      });
    }
    return jsonResponse(c, { status: "ok" }, 202, "application/activity+json");
  });

  app.post("/outbox", async (c) => {
    const domain = getDomain(c);
    const db = createDB(env);
    const config = await db.getServiceActorConfig();
    const actorUrl = config.actorUrl || `https://${domain}/actor`;
    const { uri } = await c.req.json().catch(() => ({ uri: undefined }));
    if (!uri || typeof uri !== "string") {
      return jsonResponse(c, { error: "bad request" }, 400);
    }
    const followers = config.followers ?? [];
    if (followers.length > 0) {
      const announce = {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${actorUrl}/activities/${crypto.randomUUID()}`,
        type: "Announce",
        actor: actorUrl,
        object: uri,
      };
      await deliverActivityPubObject(
        followers,
        announce,
        "system",
        domain,
        env,
      ).catch(() => {});
    }
    return jsonResponse(c, { status: "ok" }, 202, "application/activity+json");
  });

  app.get("/outbox", (c) => {
    const domain = getDomain(c);
    const outbox = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `https://${domain}/outbox`,
      type: "OrderedCollection",
      totalItems: 0,
      orderedItems: [],
    };
    return jsonResponse(c, outbox, 200, "application/activity+json");
  });

  return app;
}
