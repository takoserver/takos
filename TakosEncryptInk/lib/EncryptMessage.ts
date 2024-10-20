import type { EncryptedDataRoomKey } from "../types/EncryptedData.ts"
import type { IdentityKey, IdentityKeyPub } from "../types/identityKeyAndAccountKey.ts"
import type {
  EncryptedMessage,
  Message,
  MessageValue,
  NotEncryptedMessage,
  processedMessage,
} from "../types/Messages.ts"
import type { RoomKey } from "../types/roomKey.ts"
import { base64ToArrayBuffer } from "../utils/buffers.ts"
import { concatenateUint8Arrays } from "../utils/connectBinary.ts"
import { hashHexKey } from "../utils/hashHexKey.ts"
import { sign, verify } from "../utils/sign.ts"
import { decryptDataAESGCMs, encryptDataAESGCMs } from "./encryptData.ts"

export async function encryptMessage(
  messageVaue: MessageValue,
  channel: string,
  roomKey: RoomKey,
  identityKey: IdentityKey,
  isLarge: boolean,
): Promise<EncryptedMessage> {
  const encryptedData = await encryptDataAESGCMs(
    JSON.stringify(messageVaue),
    roomKey,
  ) as EncryptedDataRoomKey
  const timestamp = new Date().toISOString()
  const signature = sign(
    identityKey,
    concatenateUint8Arrays([
      new Uint8Array(base64ToArrayBuffer(encryptedData.encryptedData)),
      new TextEncoder().encode(timestamp),
      new TextEncoder().encode(channel),
    ]),
  )
  return {
    encrypted: true,
    value: encryptedData,
    signature: signature,
    channel: channel,
    timestamp: timestamp,
    isLarge: isLarge,
  }
}

export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  roomKey: RoomKey,
  identityKey: IdentityKeyPub,
  serverData: {
    messageId: string
    timestamp: string
    read : boolean
  },
): Promise<processedMessage | null> {
  if (!encryptedMessage.encrypted) {
    return null
  }
  const signature = encryptedMessage.signature
  const value = encryptedMessage.value
  const channel = encryptedMessage.channel
  const timestamp = encryptedMessage.timestamp
  if (
    !verify(
      identityKey,
      concatenateUint8Arrays([
        new Uint8Array(base64ToArrayBuffer(value.encryptedData)),
        new TextEncoder().encode(timestamp),
        new TextEncoder().encode(channel),
      ]),
      signature,
    )
  ) {
    return null
  }
  const decryptedData = await decryptDataAESGCMs(value, roomKey)
  const message = JSON.parse(decryptedData) as MessageValue
  //timestampがserverData.timestampとの誤差が10秒以内であることを確認する
  if (
    Math.abs(
      new Date(serverData.timestamp).getTime() - new Date(timestamp).getTime(),
    ) > 10000
  ) {
    return null
  }
  return {
    message: message.message,
    type: message.type,
    replyTo: message.replyTo,
    origin: message.origin,
    read: serverData.read,
    timestamp: serverData.timestamp,
    timestampOriginal: timestamp,
    messageId: serverData.messageId,
    channel: channel,
    verifyed: true,
    sharedUser: roomKey.masterKeysHashHex,
    roomKeyHashHex: await hashHexKey(roomKey),
  }
}

export function processedNotEncryptMessage(
  messageValue: MessageValue,
  channel: string,
  serverData: {
    messageId: string
    read: boolean,
    timestamp: string,
  },
): processedMessage {
  return {
    message: messageValue.message,
    type: messageValue.type,
    replyTo: messageValue.replyTo,
    origin: messageValue.origin,
    timestamp: serverData.timestamp,
    messageId: "",
    channel: channel,
    verifyed: false,
    roomKeyHashHex: "",
    read: serverData.read,
  }
}
