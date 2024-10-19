import type { Sign } from "./Sign.ts";

interface Message {
    encrypted: false;
    value: {
      message: string;
      type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
      version: number;
      channel: string;
      replyTo?: string;
      origin?: string;
    };
    signature: Sign;
    timestamp: string; // ISO 8601形式の文字列を想定
    isLarge?: boolean;
  }
  
  type EncryptedMessage = {
    encrypted: true;
    value: EncryptedMessageValue;
    timestamp: string;
    signature: Sign;
    isLarge?: boolean;
  };
  
  type EncryptedMessageValue = {
    message: string;
    type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
    version: number;
    channel: string;
    replyTo?: string;
    origin?: string;
  };
  
  type ServerMessage = {
    timestamp: string;
    messageId: string;
    channel: string;
    message: Message | EncryptedMessage;
  };
  