import type { ActivityPubObject } from "../microblog/types.ts";
import { apiFetch } from "../../utils/config.ts";

/**
 * to が自分のみ、または指定相手とのダイレクトメッセージを取得
 */
export async function fetchDirectMessages(
  actor: string,
  peer?: string,
): Promise<ActivityPubObject[]> {
  try {
    const params = new URLSearchParams({ actor });
    if (peer) params.set("peer", peer);
    const res = await apiFetch(`/api/dm?${params.toString()}`);
    if (!res.ok) throw new Error("DMの取得に失敗しました");
    return await res.json();
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    return [];
  }
}

export interface DMAttachment {
  url: string;
  mediaType: string;
}

/**
 * 指定した相手にダイレクトメッセージを送信
 */
export async function sendDirectMessage(
  from: string,
  to: string[],
  content: string,
  attachments?: DMAttachment[],
): Promise<boolean> {
  try {
    const res = await apiFetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: from,
        content,
        to,
        attachments,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Error sending direct message:", error);
    return false;
  }
}
