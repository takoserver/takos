// deno-lint-ignore-file no-explicit-any
import KeyPackageModel from "../models/key_package.ts";
import BaseRepository from "./base.ts";

export default class KeyPackageRepository extends BaseRepository<any> {
  constructor() {
    super(KeyPackageModel);
  }
}
