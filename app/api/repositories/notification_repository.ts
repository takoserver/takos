// deno-lint-ignore-file no-explicit-any
import NotificationModel from "../models/notification.ts";
import BaseRepository from "./base.ts";

export default class NotificationRepository extends BaseRepository<any> {
  constructor() {
    super(NotificationModel);
  }
}
