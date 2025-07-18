import NotificationRepository from "../repositories/notification_repository.ts";
import { sendNotification as sendFcm } from "./fcm.ts";

const repo = new NotificationRepository();

/**
 * 通知を追加するユーティリティ関数
 */
export async function addNotification(
  title: string,
  message: string,
  type: string = "info",
  env: Record<string, string>,
) {
  const n = await repo.create({ title, message, type }, env);
  await sendFcm(title, message, env);
  return n;
}
