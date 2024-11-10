import { atom } from "solid-jotai";

import setting from "../setting.json";

export const loginState = atom<boolean>();
export const loadState = atom<boolean>(false);
export const userIdState = atom<string | null>();
export const webSocketState = atom<WebSocket | null>();
export const pageState = atom<string>();
export const inputMessageState = atom<string>("");
export const MasterKeyState = atom<
  {
    public: string;
    private: string;
  } | null
>();
export const setDefaultServerState = atom<boolean>(setting.setDefaultServer);
export const defaultServerState = atom<string>(setting.domain);
export const exproleServerState = atom<{
  domain: string;
}[]>(setting.servers);

export const IdentityKeyAndAccountKeyState = atom<
  [string, string, {
    identityKey: {
      public: string;
      private: string;
    };
    accountKey: {
      public: string;
      private: string;
    };
  }][]
>([]);
export const deviceKeyState = atom<string | null>();
export const friendMasterKeysState = atom<{
  userId: string;
  masterKey: string;
}[]>();
export const friendIdentityKeyAndAccountKeyState = atom<{
  userId: string;
  identityKey: string;
  accountKey?: string;
}[]>();
export const setUpState = atom<boolean>(false);
export const EncryptedSessionState = atom<boolean>(false);
export const isValidInputState = atom<boolean>(false);

export const domainState = atom<string | null>();
export const sessionidState = atom<string | null>();

export const iconState = atom<string | null>();
export const nicknameState = atom<string | null>();
export const birthdayState = atom<string | null>();
export const notificationState = atom<{
  id: string;
  type: string;
  sender: string;
  query?: object;
}[]>([]);

export const talkListState = atom<{
  roomName: string;
  timestamp: string;
  type: "group" | "friend";
  roomid: string;
}[]>();
