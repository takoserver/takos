// deno-lint-ignore-file no-explicit-any
import SystemKeyModel from "../models/system_key.ts";
import BaseRepository from "./base.ts";

export default class SystemKeyRepository extends BaseRepository<any> {
  constructor() {
    super(SystemKeyModel);
  }
}
