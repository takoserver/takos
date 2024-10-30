import type { EncryptedMessage, Message, NotEncryptMessage } from "../types/Message.ts"
import { decryptDataRoomKey, encryptDataRoomKey } from "./encrypt/roomKey.ts"

export async function EncryptMessage(
  roomKey: string,
  type: "text" | "image" | "video" | "audio" | "file" | "other",
  content: string,
  channel: string,
  timestamp: string,
  isLarge: boolean,
  orignal?: string,
): Promise<string> {
  const value = JSON.stringify({ type, content })
  const valueEncrypted = await encryptDataRoomKey(roomKey, value)
  const message: EncryptedMessage = {
    encrypted: true,
    value: valueEncrypted,
    channel,
    orignal,
    timestamp,
    isLarge,
  }
  return JSON.stringify(message)
}

export async function DecryptMessage(
  message: string,
  roomKey: string,
): Promise<string> {
  const messageObject: EncryptedMessage = JSON.parse(message)
  const value = await decryptDataRoomKey(messageObject.value, roomKey)
  const valueObject = JSON.parse(value)
  const decryptedMessage: NotEncryptMessage = {
    encrypted: false,
    value: {
      type: valueObject.type,
      content: valueObject.content,
    },
    channel: messageObject.channel,
    orignal: messageObject.orignal,
    timestamp: messageObject.timestamp,
    isLarge: messageObject.isLarge,
  }
  return JSON.stringify(decryptedMessage)
}