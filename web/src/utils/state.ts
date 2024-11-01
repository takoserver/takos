import { atom } from "solid-jotai";

import setting from "../setting.json";

export const loginState = atom<boolean>();
export const loadState = atom<boolean>(false);
export const userIdState = atom<string | null>();
export const serverState = atom<string | null>();
export const webSocketState = atom<WebSocket | null>();
export const selectedRoomState = atom<string | null>();
export const pageState = atom<string>();
export const inputMessageState = atom<string>("");
export const MasterKeyState = atom<string | null>();

export const setDefaultServerState = atom<boolean>(setting.setDefaultServer);
export const defaultServerState = atom<string>(setting.domain);
export const exproleServerState = atom<{
  domain: string;
}[]>(setting.servers);

export const IdentityKeyAndMasterKeyState = atom<
  [string, {
    identityKey: string
    accountKey: string
  }[]] | null
>();
export const deviceKeyState = atom<string | null>();
export const roomListState = atom<{
  roomId: string;
  type: "group" | "direct";
  name: string;
  icon: string;
}[]>();
export const friendMasterKeysState = atom<{
  userId: string;
  masterKey: string;
}[]>();
export const friendIdentityKeyAndAccountKeyState = atom<{
  userId: string;
  identityKey: string;
  accountKey?: string;
}[]>();
export const roomKeyState = atom<{
  roomId: string;
  roomKey: string;
  userId: string;
}[]>();

export const setUpState = atom<boolean>(false);
export const EncryptedSessionState = atom<boolean>(false);
export const isValidInputState = atom<boolean>(false);


export const domainState = atom<string | null>();
export const sessionidState = atom<string | null>();