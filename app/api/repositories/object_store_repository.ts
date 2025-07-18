// deno-lint-ignore-file no-explicit-any
import ObjectStoreModel from "../models/object_store.ts";
import BaseRepository from "./base.ts";

export default class ObjectStoreRepository extends BaseRepository<any> {
  constructor() {
    super(ObjectStoreModel);
  }
}
