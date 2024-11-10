import { atom } from "solid-jotai";

export const selectedRoomState = atom<
  {
    roomName: string;
    type: "room" | "friend";
  } | null
>();

export const isSelectRoomState = atom<boolean>(false);
export const roomKeyState = atom<{
  userId: string;
  keyHash: string;
  timestamp: string;
  key: string;
}[]>([]);

export const myLatestRoomKeyState = atom<string | null>(null);