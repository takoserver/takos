import { apiFetch } from "../../utils/config.ts";

export const listDMMessages = async (
  userA: string,
  userB: string,
): Promise<unknown[]> => {
  const params = new URLSearchParams({ userA, userB });
  const res = await apiFetch(`/api/dm/messages?${params.toString()}`);
  if (!res.ok) return [];
  return await res.json();
};

export const sendDMMessage = async (
  from: string,
  to: string,
  content: string,
): Promise<void> => {
  await apiFetch("/api/dm/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, content }),
  });
};
