import TenantRepository from "../repositories/tenant_repository.ts";

const repo = new TenantRepository();

export async function ensureTenant(id: string, domain: string) {
  const exists = await repo.findById(id);
  if (!exists) {
    await repo.create({ _id: id, domain });
  }
}
