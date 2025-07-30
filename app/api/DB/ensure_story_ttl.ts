// deno-lint-ignore no-explicit-any
export async function ensureStoryTTLIndex(db: any) {
  await db.collection("stories").createIndex({ expiresAt: 1 }, {
    expireAfterSeconds: 0,
  });
}
