import { createTakosApp } from "./server.ts";
import { connectDatabase } from "../shared/db.ts";
import { ensureTenant } from "./services/tenant.ts";
import { createDB } from "./DB/mod.ts";
import { ensureStoryTTLIndex } from "./DB/ensure_story_ttl.ts";
import { loadConfig } from "../shared/config.ts";

const env = await loadConfig();
await connectDatabase(env);
const db = createDB(env);
const native = await db.getDatabase();
await ensureStoryTTLIndex(native);
if (env["ACTIVITYPUB_DOMAIN"]) {
  const domain = env["ACTIVITYPUB_DOMAIN"];
  await ensureTenant(db, domain, domain);
}
const app = await createTakosApp(env);
Deno.serve(app.fetch);
