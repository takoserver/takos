import type { DB } from "../../shared/db.ts";
import { MongoDB } from "./mongo.ts";

export { MongoDB };

/** 環境変数に応じて適切な DB 実装を返す */
export function createDB(env: Record<string, string>): DB {
  const tenantId = env["DB_MODE"] === "host"
    ? env["ACTIVITYPUB_DOMAIN"]
    : undefined;
  return new MongoDB(env, tenantId);
}
