export interface MessageData {
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: number;
  messageid: string;
  roomid: string;
  original?: string;
  serverData: {
    userName: string;
    timestamp: number;
  };
}

export type MessageContentType = "text" | "image" | "video" | "audio" | "file";

export interface MessageContent {
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string | MessageContentType;
  timestamp: number;
  original?: string;
}
