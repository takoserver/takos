// deno-lint-ignore-file no-explicit-any
import AccountModel from "../models/account.ts";
import BaseRepository from "./base.ts";

export default class AccountRepository extends BaseRepository<any> {
  constructor() {
    super(AccountModel);
  }
}
