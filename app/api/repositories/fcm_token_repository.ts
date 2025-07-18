// deno-lint-ignore-file no-explicit-any
import FcmTokenModel from "../models/fcm_token.ts";
import BaseRepository from "./base.ts";

export default class FcmTokenRepository extends BaseRepository<any> {
  constructor() {
    super(FcmTokenModel);
  }
}
