import { atom } from "solid-jotai";
import type {
  AccountKey,
  deviceKey,
  IdentityKey,
  MasterKey,
} from "@takos/takos-encrypt-ink";

import setting from "../setting.json";

export const loginState = atom<boolean>();
export const loadState = atom<boolean>(false);
export const userIdState = atom<string | null>();
export const serverState = atom<string | null>();
export const webSocketState = atom<WebSocket | null>();
export const selectedRoomState = atom<string | null>();
export const pageState = atom<string>();
export const inputMessageState = atom<[string, string][]>();
export const MasterKeyState = atom<MasterKey | null>();

export const setDefaultServerState = atom<boolean>(setting.setDefaultServer);
export const defaultServerState = atom<string>(setting.domain);
export const exproleServerState = atom<{
  domain: string;
}[]>(setting.servers);

export const IdentityKeyAndMasterKeyState = atom<
  [string, {
    identityKey: IdentityKey;
    accountKey: AccountKey;
  }[]] | null
>();
export const deviceKeyState = atom<deviceKey | null>();
export const roomListState = atom<{
  roomId: string;
  type: "group" | "direct";
  name: string;
  icon: string;
}[]>();
export const friendMasterKeysState = atom<{
  userId: string;
  masterKey: MasterKey;
}[]>();
export const friendIdentityKeyAndAccountKeyState = atom<{
  userId: string;
  identityKey: IdentityKey;
  accountKey?: AccountKey;
}[]>();
export const roomKeyState = atom<{
  roomId: string;
  roomKey: string;
  userId: string;
}[]>();
