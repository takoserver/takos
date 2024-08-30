import { AccountKey } from "@takos/takos-encrypt-ink";
import {
  EncryptedDataDeviceKey,
  IdentityKey,
} from "https://jsr.io/@takos/takos-encrypt-ink/1.0.0/types.ts";

export interface serverRequest {
  host: string;
  body: string;
}
export interface profileRequest {
  userName?: string;
  userId?: string;
  friendName?: string;
  friendId?: string;
}
export interface profileResonse {
  userName: string;
  userId: string;
  nickName: string;
}
export interface Profile {
  userName: string;
  userId: string;
  nickName: string;
  age?: number;
}
export interface FriendListType {
  roomName: any;
  latestMessage: any;
  userName: any;
  isNewMessage: boolean;
  icon: string;
  roomid: string;
  isSelect: boolean;
  time?: string;
}
export interface AppStateType {
  isChoiceUser: { value: boolean | null };
  ws: { value: WebSocket | null };
  roomid: { value: string };
  sessionid: { value: string };
  talkData: { value: any[] };
  userName: { value: string };
  friendList: { value: Array<any> };
  roomName: { value: string };
  page: { value: number };
  inputMessage: { value: string };
  isValidInput: { value: boolean };
  roomType: { value: string };
  friendid: { value: string };
  ChatUserInfo: {
    value: {
      [key: string]: {
        userName: string;
        nickName: string;
        readedMessage: string;
      };
    };
  };
  MasterKey: any;
  KeyShareKey: any;
  DeviceKey: any;
  roomKey: { value: Map<string, string> };
  IdentityKeyAndAccountKeys: {
    value: IdentityKeyAndAccountKeysState;
  };
  userId: { value: string };
}
export interface MessageTypes {
  type: string;
  message: string;
  time: any;
  isRead: boolean;
  sender: string;
  senderNickName: string;
  messageid: string;
  messageType: string;
}
export interface WebSocketSessionObject {
  ws: WebSocket;
  roomid: string;
  roomType: string;
  userName: string;
  lastActivityTime: Date;
}
export interface WebSocketJoiningRoom {
  type: string;
  sessionid: string;
  roomid: string;
}
export interface WebSocketJoiningFriend {
  type: string;
  sessionid: string;
  friendid: string;
}

export interface friendRequest {
  userName: string;
  friendName: string;
}

export type IdentityKeyAndAccountKeysState = {
  identityKey: IdentityKey;
  accountKey: AccountKey;
  hashHex: string;
  keyExpiration: string;
}[];
