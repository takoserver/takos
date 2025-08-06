import type { DB } from "../../shared/db.ts";
import { generateKeyPair } from "../../shared/crypto.ts";

/**
 * Service Actor の鍵を取得する。未生成の場合は新規作成。
 * docs/FASP.md 6章の Service Actor 仕様に基づく。
 */
export async function getServiceActorKey(db: DB, domain: string) {
  let doc = await db.findServiceActorKey(domain);
  if (!doc) {
    const keys = await generateKeyPair();
    await db.saveServiceActorKey(domain, keys.privateKey, keys.publicKey);
    doc = { domain, ...keys };
  }
  return doc;
}
