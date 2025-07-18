// deno-lint-ignore-file no-explicit-any
import TenantModel from "../models/tenant.ts";
import BaseRepository from "./base.ts";

export default class TenantRepository extends BaseRepository<any> {
  constructor() {
    super(TenantModel);
  }
}
