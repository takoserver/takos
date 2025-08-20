export type ActorID = string;

export interface ChatMessage {
  id: string;
  author: string;
  displayName: string;
  address: string;
  content: string;
  attachments?: {
    data?: string;
    url?: string;
    mediaType: string;
    preview?: { url?: string; data?: string; mediaType?: string };
  }[];
  timestamp: Date;
  type: "text" | "image" | "file";
  avatar?: string;
  isMe?: boolean;
}

export interface Room {
  id: string;
  name: string;
  // 画面表示用の名称（未命名DMなどの補完に使用）。name はサーバー由来の正規名。
  displayName?: string;
  userName: string;
  domain: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline?: boolean;
  avatar?: string;
  type: "group" | "memo";
  members: ActorID[];
  // サーバー未同期時などに使用される招待者リスト（存在しない場合がある）
  pendingInvites?: ActorID[];
  status?: "joined" | "invited";
  hasName?: boolean;
  hasIcon?: boolean;
}

// トークルームの種類を判定するユーティリティ関数
export function isFriendRoom(room: Room, selfHandle?: string): boolean {
  // メモは除外
  if (room.type === "memo") return false;
  // 自分を含む場合は除外して数える
  const count = selfHandle
    ? room.members.filter((m) => m !== selfHandle).length
    : Math.max(0, room.members.length - 1);
  // 自分以外の参加者が 1 名なら 1:1 ルーム
  return count === 1;
}

export function isGroupRoom(room: Room, selfHandle?: string): boolean {
  return room.type !== "memo" && !isFriendRoom(room, selfHandle);
}

export function isMemoRoom(room: Room): boolean {
  return room.type === "memo";
}
