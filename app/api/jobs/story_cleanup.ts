// 役割: expiresAt < now の Story を UI から除外。TTL index で物理削除。
// アーカイブ/ハイライト運用をする場合のみ、期限切れ直前に移動。
export async function runStoryCleanup() {
  // const soonExpired = await repo.findExpiringStories({ withinMinutes: 5 });
  // for (const s of soonExpired) await repo.maybeArchiveOrKeepIfHighlighted(s);
}
