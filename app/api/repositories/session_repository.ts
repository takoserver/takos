// deno-lint-ignore-file no-explicit-any
import SessionModel from "../models/session.ts";
import BaseRepository from "./base.ts";

export default class SessionRepository extends BaseRepository<any> {
  constructor() {
    super(SessionModel);
  }
}
