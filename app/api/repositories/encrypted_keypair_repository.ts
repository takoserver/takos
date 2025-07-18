// deno-lint-ignore-file no-explicit-any
import EncryptedKeypairModel from "../models/encrypted_keypair.ts";
import BaseRepository from "./base.ts";

export default class EncryptedKeypairRepository extends BaseRepository<any> {
  constructor() {
    super(EncryptedKeypairModel);
  }
}
