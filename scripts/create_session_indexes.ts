import { initConfig } from "../shared/config.ts";
import { connectDatabase } from "../app/api/db.ts";
import Session from "../app/api/models/session.ts";
import HostSession from "../app/takos_host/models/session.ts";

const env = await initConfig();
await connectDatabase(env);

await Session.collection.createIndex({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
});
await HostSession.collection.createIndex({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
});

console.log("TTL indexes created");
