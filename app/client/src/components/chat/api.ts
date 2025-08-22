import { apiFetch } from "../../utils/config.ts";
import type { ChatMessage } from "./types.ts";

interface StoredMessage {
  _id: string;
  actor_id: string;
  content: string;
  published: string;
}

const toChatMessage = (
  self: string,
) =>
(m: StoredMessage): ChatMessage => ({
  id: m._id,
  author: m.actor_id,
  displayName: m.actor_id,
  address: m.actor_id,
  content: m.content,
  timestamp: new Date(m.published),
  type: "text",
  isMe: m.actor_id.endsWith(`/users/${self}`) || m.actor_id === self,
});

export async function fetchDirectMessages(
  peer: string,
  author: string,
  before?: string,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ author, peer });
  if (before) params.set("before", before);
  const res = await apiFetch(`/api/dm?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json() as { messages: StoredMessage[] };
  return data.messages.map(toChatMessage(author));
}

export async function sendDirectMessage(
  author: string,
  to: string,
  content: string,
): Promise<boolean> {
  const res = await apiFetch(`/api/dm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, to, content }),
  });
  return res.ok;
}
