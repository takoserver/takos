// deno-lint-ignore-file no-explicit-any
import RemoteActorModel from "../models/remote_actor.ts";
import BaseRepository from "./base.ts";

export default class RemoteActorRepository extends BaseRepository<any> {
  constructor() {
    super(RemoteActorModel);
  }
}
