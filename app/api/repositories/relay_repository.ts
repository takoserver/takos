// deno-lint-ignore-file no-explicit-any
import RelayModel from "../models/relay.ts";
import BaseRepository from "./base.ts";

export default class RelayRepository extends BaseRepository<any> {
  constructor() {
    super(RelayModel);
  }
}
