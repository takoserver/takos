import { Accessor, createSignal, Setter } from "solid-js";
import type {
  AccountKey,
  AccountKeyPub,
  deviceKey,
  IdentityKey,
  IdentityKeyPub,
  KeyShareKey,
  MasterKey,
  MasterKeyPub,
  RoomKey,
} from "@takos/takos-encrypt-ink";

type Signal<T> = {
  accessor: Accessor<T>;
  setter: Setter<T>;
};

export type AppState = {
  login: Signal<boolean>;
  load: Signal<"loading" | "loaded" | "error">;
  websocket: Signal<WebSocket | null>;
  roomsData: Signal<[string, {
    roomType: string;
    roomName: string;
    roomid: string;
    talkData: {
      message: string;
      type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
      replyTo?: string;
      origin?: string;
      timestamp: string;
      timestampOriginal?: string;
      read: boolean;
      messageId: string;
      channel: string;
      verifyed: boolean;
      roomKeyHashHex: string;
      sharedUser?: {
        [key: string]: string;
      };
    }[];
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
  login: boolean;
  page: number;
  userId: string;
  websocket: WebSocket | null;
  selectedRoom: string | null;
  roomsData?: [string, {
    roomType: string;
    roomName: string;
    roomid: string;
    talkData: {
      message: string;
      type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
      replyTo?: string;
      origin?: string;
      timestamp: string;
      timestampOriginal?: string;
      read: boolean;
      messageId: string;
      channel: string;
      verifyed: boolean;
      roomKeyHashHex: string;
      sharedUser?: {
        [key: string]: string;
      };
    }[];
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

export const createAppState = (): AppState => {
  return {
    login: createTypedSignal<boolean>(false),
    load: createTypedSignal<"loading" | "loaded" | "error">("loading"),
    websocket: createTypedSignal<WebSocket | null>(null),
    roomsData: createTypedSignal<[string, {
      roomType: string;
      roomName: string;
      roomid: string;
      talkData: {
        message: string;
        type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
        replyTo?: string;
        origin?: string;
        timestamp: string;
        timestampOriginal?: string;
        read: boolean;
        messageId: string;
        channel: string;
        verifyed: boolean;
        roomKeyHashHex: string;
        sharedUser?: {
          [key: string]: string;
        };
      }[];
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
      }[]>([]),
    },
    friendList: createTypedSignal<{
      userId: string;
      nickName: string;
      lastMessage: string;
      lastTimestamp: string;
      unread: number;
    }[]>([]),
  };
};

export const setUpAppState = (appState: AppState, config: AppStateConfig) => {
  appState.login.setter(config.login);
  appState.load.setter("loaded");
  appState.websocket.setter(config.websocket);
  appState.roomsData.setter(
    config.roomsData === undefined ? [] : [config.roomsData],
  );
  appState.selectedRoom.setter(config.selectedRoom);
  appState.page.setter(config.page.toString());
  appState.inputMessage.setter("");
  appState.MasterKey.setter(config.MasterKey);
  appState.IdentityKeyAndAccountKeys.setter(config.IdentityKeyAndAccountKeys);
  appState.deviceKey.setter(config.deviceKey);
  appState.KeyShareKey.setter(config.KeyShareKey);
  appState.friendKeyCache.masterKey.setter(
    config.friendKeyCache?.masterKey ?? [],
  );
  appState.friendKeyCache.identityKey.setter(
    config.friendKeyCache?.identityKey ?? [],
  );
  appState.friendKeyCache.accountKey.setter(
    config.friendKeyCache?.accountKey ?? [],
  );
  appState.friendKeyCache.roomKey.setter(config.friendKeyCache?.roomKey ?? []);
  appState.friendList.setter(config.friendList);
};
