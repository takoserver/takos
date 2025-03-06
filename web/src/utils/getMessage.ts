import { createTakosDB, decryptAccountKey } from "./idb";
import { useAtom } from "solid-jotai";
import { deviceKeyState } from "./state";
import {
  decryptDataAccountKey,
  decryptDataDeviceKey,
  decryptDataRoomKey,
} from "@takos/takos-encrypt-ink";

const userName = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;

// 新しいメッセージ型定義に基づくレスポンス型
export interface MessageResponse {
  verified: boolean;
  encrypted: boolean;
  value: {
    type: "text" | "image" | "video" | "audio" | "file" | "thumbnail";
    content: string; // 各タイプに応じた内容
    reply?: {
      id: string;
    };
    mention: string[];
  };
  channel: string;
  original?: string;
  timestamp: number;
  isLarge: boolean;
}

export async function getMessage({
  messageid,
  type,
  roomId,
  senderId,
}: {
  messageid: string;
  type: string;
  roomId: string;
  senderId: string;
}): Promise<MessageResponse> {
  const [deviceKey] = useAtom(deviceKeyState);
  const deviceKeyVal = deviceKey();
  if (!deviceKeyVal) throw new Error("DeviceKey not found");

  const encryptedMessageRes = await fetch(
    `https://${messageid.split("@")[1]}/_takos/v1/message/${messageid}`,
    { cache: "force-cache" }, // キャッシュを積極的に使用
  );
  if (encryptedMessageRes.status !== 200) {
    throw new Error("Unauthorized");
  }

  const encryptedMessage = await encryptedMessageRes.json();
  const parsedMessage = JSON.parse(encryptedMessage.message);

  // 非暗号化メッセージの処理
  if (!parsedMessage.encrypted) {
    return {
      verified: true,
      encrypted: false,
      value: parsedMessage.value,
      channel: parsedMessage.channel,
      original: parsedMessage.original,
      timestamp: encryptedMessage.timestamp,
      isLarge: parsedMessage.isLarge,
    };
  }

  // 暗号化メッセージの処理
  const messageValue = JSON.parse(parsedMessage.value);
  const roomKeyHash = messageValue.keyHash;

  // セッションストレージからroomKeyを取得、なければ取得して復号
  let roomKey = sessionStorage.getItem("roomKey-" + roomKeyHash);
  if (!roomKey) {
    let encryptedRoomKeyRes;
    if (type === "group") {
      encryptedRoomKeyRes = await fetch(
        `https://${
          messageid.split("@")[1]
        }/_takos/v1/key/roomKey?roomId=${roomId}&targetUserId=${userName}&hash=${
          encodeURIComponent(roomKeyHash)
        }&userId=${senderId}`,
      );
    } else if (type === "friend") {
      encryptedRoomKeyRes = await fetch(
        `https://${
          messageid.split("@")[1]
        }/_takos/v1/key/roomKey?targetUserId=${userName}&hash=${
          encodeURIComponent(roomKeyHash)
        }&userId=${senderId}`,
      );
    }

    if (!encryptedRoomKeyRes || encryptedRoomKeyRes.status !== 200) {
      throw new Error("Unauthorized");
    }

    const encryptedRoomKey = (await encryptedRoomKeyRes.json()).roomKey;
    const accountKeyHash = JSON.parse(encryptedRoomKey).keyHash;

    const db = await createTakosDB();
    const accountKey = await db.get("accountKeys", accountKeyHash);
    if (!accountKey) {
      throw new Error("AccountKey not found");
    }

    const decryptedAccountKey = await decryptAccountKey({
      deviceKey: deviceKeyVal,
      encryptedAccountKey: accountKey.encryptedKey,
    });

    if (!decryptedAccountKey) {
      throw new Error("Failed to decrypt accountKey");
    }

    const roomKeyResult = await decryptDataAccountKey(
      decryptedAccountKey.privateKey,
      encryptedRoomKey,
    );

    if (!roomKeyResult) {
      throw new Error("Failed to decrypt roomKey");
    }

    roomKey = roomKeyResult;
    sessionStorage.setItem("roomKey-" + roomKeyHash, roomKey);
  }

  // roomKeyを使ってメッセージを復号
  const decryptedMessage = await decryptDataRoomKey(
    roomKey,
    parsedMessage.value,
  );

  if (!decryptedMessage) {
    throw new Error("Failed to decrypt message");
  }

  // 復号したメッセージをパース
  const decryptedContent = JSON.parse(decryptedMessage);
  console.log(parsedMessage);
  return {
    verified: false, // 署名検証が実装されていない場合はfalse
    encrypted: true,
    value: {
      type: decryptedContent.type,
      content: decryptedContent.content, // コンテンツはJSONの場合があるためパース
      reply: decryptedContent.reply,
      mention: decryptedContent.mention || [],
    },
    channel: parsedMessage.channel,
    original: parsedMessage.original,
    timestamp: encryptedMessage.timestamp,
    isLarge: parsedMessage.isLarge,
  };
}

export function createTextContent({
  text,
  format,
}: {
  text: string;
  format: "text" | "markdown";
}) {
  return JSON.stringify({
    text,
    format,
  });
}

export function createMediaContent({
  uri,
  metadata,
}: {
  uri: string;
  metadata: {
    filename: string;
    mimeType: string;
  };
}) {
  return JSON.stringify({
    uri,
    metadata,
  });
}

/*
// 6. thumbnailタイプのコンテンツ
interface TextThumbnail {
    originalType: "text";
    thumbnailText: string;
}

// 画像・動画用のサムネイル
interface MediaThumbnail {
    originalType: "image" | "video";
    thumbnailUri: string;       // 実際の画像/動画サムネイル
    thumbnailMimeType: string;
}

interface FilesThumbnail {
    originalType: "file" | "audio";
    thumbnailText: string;
}

export type ThumbnailContent = TextThumbnail | MediaThumbnail | FilesThumbnail;
*/

export function createThumbnailContent({
  originalType,
  thumbnailText,
  thumbnailUri,
  thumbnailMimeType,
}: {
  originalType: "text" | "image" | "video" | "audio" | "file";
  thumbnailText?: string;
  thumbnailUri?: string;
  thumbnailMimeType?: string;
}) {
  if (originalType === "text") {
    return JSON.stringify({
      originalType,
      thumbnailText,
    });
  } else if (originalType === "image" || originalType === "video") {
    return JSON.stringify({
      originalType,
      thumbnailUri,
      thumbnailMimeType,
    });
  } else {
    return JSON.stringify({
      originalType,
      thumbnailText,
    });
  }
}
