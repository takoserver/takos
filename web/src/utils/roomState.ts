import { atom } from "solid-jotai";

export const selectedRoomState = atom<
  {
    roomName: string;
    roomid: string;
    type: "room" | "friend";
  } | null
>();

export const isSelectRoomState = atom<boolean>(false);
export const roomKeyState = atom<{
  userId: string;
  key: string;
  metaData: string;
  id: string;
}[]>([]);

export const myLatestRoomKeyState = atom<string | null>(null);
