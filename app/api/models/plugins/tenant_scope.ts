import mongoose from "mongoose";

interface TenantScopeOptions {
  envKey: string;
}

export default function tenantScope(
  schema: mongoose.Schema,
  options: TenantScopeOptions,
) {
  schema.add({ tenant_id: { type: String, index: true } });

  schema.pre("save", function (next) {
    const tenantId = Deno.env.get(options.envKey);
    if (tenantId && !this.get("tenant_id")) {
      this.set("tenant_id", tenantId);
    }
    next();
  });

  const addTenantFilter = function (
    this: mongoose.Query<unknown, unknown>,
    next: mongoose.CallbackWithoutResultAndOptionalError,
  ) {
    const tenantId = Deno.env.get(options.envKey);
    if (tenantId) {
      const filter = this.getFilter();
      if (!("tenant_id" in filter)) {
        this.where({ tenant_id: tenantId });
      }
    }
    next();
  };

  const queryHooks = [
    "find",
    "findOne",
    "updateOne",
    "updateMany",
    "deleteOne",
    "deleteMany",
    "findOneAndUpdate",
    "findOneAndDelete",
    "findOneAndRemove",
    "findOneAndReplace",
  ];

  for (const hook of queryHooks) {
    schema.pre(hook, addTenantFilter);
  }
}
