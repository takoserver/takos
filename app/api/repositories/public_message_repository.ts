// deno-lint-ignore-file no-explicit-any
import PublicMessageModel from "../models/public_message.ts";
import BaseRepository from "./base.ts";

export default class PublicMessageRepository extends BaseRepository<any> {
  constructor() {
    super(PublicMessageModel);
  }
}
