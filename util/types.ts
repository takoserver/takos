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
  talkData: { value: MessageTypes[] };
  userName: string;
  friendList: { value: Array<any> };
  roomName: { value: string };
  page: { value: number };
  inputMessage: { value: string };
  isValidInput: { value: boolean };
  roomType: { value: string };
  friendid: { value: string };
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
  userid: string;
  ws: WebSocket;
  roomid: string;
  roomType: string;
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
