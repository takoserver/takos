import InboxEntryRepository from "../repositories/inbox_entry_repository.ts";

const repo = new InboxEntryRepository();

export async function addInboxEntry(tenantId: string, objectId: string) {
  await repo.updateOne(
    { tenant_id: tenantId, object_id: objectId },
    { $setOnInsert: { received_at: new Date() } },
    { upsert: true },
  );
}
