// deno-lint-ignore-file no-explicit-any
import GroupModel from "../models/group.ts";
import BaseRepository from "./base.ts";

export default class GroupRepository extends BaseRepository<any> {
  constructor() {
    super(GroupModel);
  }
}
