import { apiFetch } from "../../utils/config.ts";
import type { Room } from "./types.ts";

export interface PlainMessage {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
}

export const searchRooms = async (
  owner: string,
): Promise<{ id: string }[]> => {
  try {
    const params = new URLSearchParams();
    params.set("owner", owner);
    const res = await apiFetch(`/api/rooms?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.rooms) ? data.rooms : [];
  } catch (err) {
    console.error("Error searching rooms:", err);
    return [];
  }
};

export const addRoom = async (
  id: string,
  room: Room,
): Promise<boolean> => {
  try {
    const body = { owner: id, id: room.id };
    const res = await apiFetch(`/api/ap/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error("Error adding room:", err);
    return false;
  }
};

export const fetchMessages = async (
  roomId: string,
): Promise<PlainMessage[]> => {
  try {
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/messages`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data as PlainMessage[] : [];
  } catch (err) {
    console.error("Error fetching messages:", err);
    return [];
  }
};

export const sendMessage = async (
  roomId: string,
  from: string,
  to: string[],
  content: string,
): Promise<boolean> => {
  try {
    const payload = { from, to, content, mediaType: "text/plain" };
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending message:", err);
    return false;
  }
};
