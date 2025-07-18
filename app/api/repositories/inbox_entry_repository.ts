// deno-lint-ignore-file no-explicit-any
import InboxEntryModel from "../models/inbox_entry.ts";
import BaseRepository from "./base.ts";

export default class InboxEntryRepository extends BaseRepository<any> {
  constructor() {
    super(InboxEntryModel);
  }
}
