import { MessageData } from "../../types/message";
import { getMessage } from "./getMessage";

// メッセージキャッシュ
const messageCache = new Map<string, MessageData>();

export const getCachedMessage = async (
  messageid: string,
  roomId: string,
  type: string,
  senderId: string,
): Promise<MessageData> => {
  // キャッシュキーを作成
  const cacheKey = `${messageid}-${roomId}`;

  // キャッシュをチェック
  if (messageCache.has(cacheKey)) {
    return messageCache.get(cacheKey)!;
  }

  try {
    const serverData = await getMessage({
      messageid,
      roomId,
      type,
      senderId,
    });

    const messageData: MessageData = {
      verified: serverData.verified,
      encrypted: serverData.encrypted,
      content: serverData.value.content,
      type: String(serverData.value.type),
      timestamp: Number(serverData.timestamp),
      messageid,
      roomid: roomId,
      original: serverData.original,
      serverData: {
        userName: senderId,
        timestamp: Number(serverData.timestamp),
      },
    };

    // キャッシュに保存
    messageCache.set(cacheKey, messageData);

    return messageData;
  } catch (error) {
    const errorMessage: MessageData = {
      verified: false,
      encrypted: false,
      content: "メッセージの取得に失敗しました",
      type: "error",
      timestamp: new Date().getTime(),
      messageid,
      roomid: roomId,
      serverData: {
        userName: senderId,
        timestamp: new Date().getTime(),
      },
    };

    // エラーメッセージもキャッシュ
    messageCache.set(cacheKey, errorMessage);
    return errorMessage;
  }
};

export const clearRoomCache = (roomId: string) => {
  // 指定されたルームのキャッシュをクリア
  const keysToDelete: string[] = [];

  messageCache.forEach((_, key) => {
    if (key.endsWith(`-${roomId}`)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => messageCache.delete(key));
};
