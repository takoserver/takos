// deno-lint-ignore-file no-explicit-any
import RelayEdgeModel from "../models/relay_edge.ts";
import BaseRepository from "./base.ts";

export default class RelayEdgeRepository extends BaseRepository<any> {
  constructor() {
    super(RelayEdgeModel);
  }
}
