import type { EncryptedDataRoomKey } from "./EncryptedData.ts"
// deno-lint-ignore ban-ts-comment
//@ts-ignore
import type { Sign } from "./sign.ts"

export interface NotEncryptedMessage {
  encrypted: false
  value: {
    message: string
    type: "text" | "image" | "video" | "audio" | "file" | "thumbnail"
    version: number
    replyTo?: string
  }
  origin?: string
  signature: Sign
  channel: string
  timestamp: string // ISO 8601形式の文字列を想定
  isLarge: boolean
}

export type EncryptedMessage = {
  encrypted: true
  channel: string
  value: EncryptedDataRoomKey
  timestamp: string
  signature: Sign
  isLarge: boolean
}

export type Message = NotEncryptedMessage | EncryptedMessage

export type MessageValue = {
  message: string
  type: "text" | "image" | "video" | "audio" | "file" | "thumbnail"
  version: number
  replyTo?: string
  origin?: string
}

export type ServerMessage = {
  timestamp: string
  messageId: string
  message: Message
}

export type processedMessage = {
  message: string
  type: "text" | "image" | "video" | "audio" | "file" | "thumbnail"
  replyTo?: string
  origin?: string
  timestamp: string
  timestampOriginal?: string;
  read: boolean;
  messageId: string
  channel: string
  verifyed: boolean
  roomKeyHashHex: string
  sharedUser?: {
    [key: string]: string
  }
}
