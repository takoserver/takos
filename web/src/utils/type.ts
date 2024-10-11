import { Accessor, createSignal, Setter } from "solid-js";
import type { MasterKey, IdentityKey, AccountKey, deviceKey, KeyShareKey, RoomKey, IdentityKeyPub, AccountKeyPub, MasterKeyPub } from "@takos/takos-encrypt-ink";

type Signal<T> = {
  accessor: Accessor<T>;
  setter: Setter<T>;
};

export type AppState = {
  load: Signal<"loading" | "loaded" | "error">;
  websocket: Signal<WebSocket | null>;
  roomsData: Signal<[string, {
    roomType: string;
    roomName: string;
    roomid?: string;
    userId: string;
    talkData: {
      messageid: string;
      message: string;
      userId: string;
      timestamp: string;
      timestampOriginal: string;
      read: boolean;
      type: string;
      verify: number;
      identityKeyHashHex: string;
      masterKeyHashHex: string;
      roomKeyHashHex: string;
    }[]
  }][]>;
  selectedRoom: Signal<string | null>;
  page: Signal<string>;
  inputMessage: Signal<string>;
  MasterKey: Signal<MasterKey>;
  IdentityKeyAndAccountKeys: Signal<{
    IdentityKey: IdentityKey;
    AccountKey: AccountKey;
    hashHex: string;
  }[]>;
  deviceKey: Signal<deviceKey>;
  KeyShareKey: Signal<KeyShareKey>;
  friendKeyCache: {
    masterKey: Signal<{
      hashHex: string;
      masterKey: MasterKey;
    }[]>;
    identityKey: Signal<{
      userId: string;
      hashHex: string;
      identityKey: IdentityKey;
    }[]>;
    accountKey: Signal<{
      userId: string;
      accountKey: AccountKey;
    }[]>;
    roomKey: Signal<{
      userId?: string;
      roomid?: string;
      roomKey: string;
    }[]>;
  };
  friendList: Signal<{
    userId: string;
    nickName: string;
    lastMessage: string;
    lastTimestamp: string;
    unread: number;
  }[]>;
};

export type MessageTypes = {
  type: string;
  message: string;
  userId: string;
  timestamp: string;
  timestampOriginal: string;
  read: boolean;
  verify: number;
  identityKeyHashHex: string;
  masterKeyHashHex: string;
  roomKeyHashHex: string;
};

export type AppStateConfig = {
  page: number;
  userId: string;
  websocket: WebSocket | null;
  selectedRoom: string | null;
  roomsData?: [string, {
    roomType: string;
    roomName: string;
    roomid?: string;
    userId: string;
    talkData: {
      messageid: string;
      message: string;
      userId: string;
      timestamp: string;
      timestampOriginal: string;
      read: boolean;
      type: string;
      verify: number;
      identityKeyHashHex: string;
      masterKeyHashHex: string;
      roomKeyHashHex: string;
    }[]
  }];
  friendList: {
    userId: string;
    nickName: string;
    lastMessage: string;
    lastTimestamp: string;
    unread: number;
  }[];
  MasterKey: MasterKey;
  IdentityKeyAndAccountKeys: {
    IdentityKey: IdentityKey;
    AccountKey: AccountKey;
    hashHex: string;
  }[];
  deviceKey: deviceKey;
  KeyShareKey: KeyShareKey;
  friendKeyCache?: {
    masterKey: {
      hashHex: string;
      masterKey: MasterKey;
    }[];
    identityKey: {
      userId: string;
      hashHex: string;
      identityKey: IdentityKey;
    }[];
    accountKey: {
      userId: string;
      accountKey: AccountKey;
    }[];
    roomKey: {
      userId?: string;
      roomid?: string;
      roomKey: string;
    }[];
  };
};

const createTypedSignal = <T>(initialValue: T): Signal<T> => {
  const [accessor, setter] = createSignal(initialValue);
  return { accessor, setter };
};
/*
export const createAppState = (config: AppStateConfig): AppState => {
  return {
    load: createTypedSignal<"loading" | "loaded" | "error">("loaded"),
    websocket: createTypedSignal<WebSocket | null>(config.websocket),
    roomsData: createTypedSignal(config.roomsData === undefined ? [] : [config.roomsData]),
    selectedRoom: createTypedSignal<string | null>(config.selectedRoom),
    page: createTypedSignal<string>(config.page.toString()),
    inputMessage: createTypedSignal<string>(""),
    MasterKey: createTypedSignal<MasterKey>(config.MasterKey),
    IdentityKeyAndAccountKeys: createTypedSignal(config.IdentityKeyAndAccountKeys),
    deviceKey: createTypedSignal<deviceKey>(config.deviceKey),
    KeyShareKey: createTypedSignal<KeyShareKey>(config.KeyShareKey),
    friendKeyCache: {
      masterKey: createTypedSignal(config.friendKeyCache?.masterKey ?? []),
      identityKey: createTypedSignal(config.friendKeyCache?.identityKey ?? []),
      accountKey: createTypedSignal(config.friendKeyCache?.accountKey ?? []),
      roomKey: createTypedSignal(config.friendKeyCache?.roomKey ?? [])
    },
    friendList: createTypedSignal(config.friendList)
  };
};*/
export const createAppState = () => {
  return {
    load: createTypedSignal<"loading" | "loaded" | "error">("loading"),
    websocket: createTypedSignal<WebSocket | null>(null),
    roomsData: createTypedSignal<[string, {
      roomType: string;
      roomName: string;
      roomid?: string;
      userId: string;
      talkData: {
        messageid: string;
        message: string;
        userId: string;
        timestamp: string;
        timestampOriginal: string;
        read: boolean;
        type: string;
        verify: number;
        identityKeyHashHex: string;
        masterKeyHashHex: string;
        roomKeyHashHex: string;
      }[]
    }][]>([]),
    selectedRoom: createTypedSignal<string | null>(null),
    page: createTypedSignal<string>("0"),
    inputMessage: createTypedSignal<string>(""),
    MasterKey: createTypedSignal<MasterKey>({} as MasterKey),
    IdentityKeyAndAccountKeys: createTypedSignal<{
      IdentityKey: IdentityKey;
      AccountKey: AccountKey;
      hashHex: string;
    }[]>([]),
    deviceKey: createTypedSignal<deviceKey>({} as deviceKey),
    KeyShareKey: createTypedSignal<KeyShareKey>({} as KeyShareKey),
    friendKeyCache: {
      masterKey: createTypedSignal<{
        hashHex: string;
        masterKey: MasterKey;
      }[]>([]),
      identityKey: createTypedSignal<{
        userId: string;
        hashHex: string;
        identityKey: IdentityKey;
      }[]>([]),
      accountKey: createTypedSignal<{
        userId: string;
        accountKey: AccountKey;
      }[]>([]),
      roomKey: createTypedSignal<{
        userId?: string;
        roomid?: string;
        roomKey: string;
      }[]>([])
    },
    friendList: createTypedSignal<{
      userId: string;
      nickName: string;
      lastMessage: string;
      lastTimestamp: string;
      unread: number;
    }[]>([])
  };
}

export const setUpAppState = (appState: AppState, config: AppStateConfig) => {
  appState.load.setter("loaded");
  appState.websocket.setter(config.websocket);
  appState.roomsData.setter(config.roomsData === undefined ? [] : [config.roomsData]);
  appState.selectedRoom.setter(config.selectedRoom);
  appState.page.setter(config.page.toString());
  appState.inputMessage.setter("");
  appState.MasterKey.setter(config.MasterKey);
  appState.IdentityKeyAndAccountKeys.setter(config.IdentityKeyAndAccountKeys);
  appState.deviceKey.setter(config.deviceKey);
  appState.KeyShareKey.setter(config.KeyShareKey);
  appState.friendKeyCache.masterKey.setter(config.friendKeyCache?.masterKey ?? []);
  appState.friendKeyCache.identityKey.setter(config.friendKeyCache?.identityKey ?? []);
  appState.friendKeyCache.accountKey.setter(config.friendKeyCache?.accountKey ?? []);
  appState.friendKeyCache.roomKey.setter(config.friendKeyCache?.roomKey ?? []);
  appState.friendList.setter(config.friendList);
}