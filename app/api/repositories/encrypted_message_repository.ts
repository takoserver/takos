// deno-lint-ignore-file no-explicit-any
import EncryptedMessageModel from "../models/encrypted_message.ts";
import BaseRepository from "./base.ts";

export default class EncryptedMessageRepository extends BaseRepository<any> {
  constructor() {
    super(EncryptedMessageModel);
  }
}
