// deno-lint-ignore-file no-explicit-any
import FollowEdgeModel from "../models/follow_edge.ts";
import BaseRepository from "./base.ts";

export default class FollowEdgeRepository extends BaseRepository<any> {
  constructor() {
    super(FollowEdgeModel);
  }
}
