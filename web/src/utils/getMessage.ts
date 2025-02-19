import { createTakosDB } from "./idb";
import { useAtom } from "solid-jotai";
import { deviceKeyState } from "./state";
import {
  decryptDataAccountKey,
  decryptDataDeviceKey,
  decryptDataRoomKey,
} from "@takos/takos-encrypt-ink";
const userName = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;
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
}): Promise<Message> {
  const [deviceKey] = useAtom(deviceKeyState);
  const deviceKeyVal = deviceKey();
  if (!deviceKeyVal) throw new Error("DeviceKey not found");
  const encryptedMessageRes = await fetch(
    `https://${messageid.split("@")[1]}/_takos/v1/message/${messageid}`,
  );
  if (encryptedMessageRes.status !== 200) {
    throw new Error("Unauthorized");
  }
  const encryptedMessage = await encryptedMessageRes.json();
  const roomKeyHash =
    JSON.parse(JSON.parse(encryptedMessage.message).value).keyHash;
  if (!JSON.parse(encryptedMessage.message).encrypted) {
    return {
      verified: true,
      encrypted: false,
      content: encryptedMessage.message,
      type: encryptedMessage.type,
      timestamp: encryptedMessage.timestamp,
    };
  }
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
    if (!encryptedRoomKeyRes) {
      throw new Error("Unauthorized");
    }
    if (encryptedRoomKeyRes.status !== 200) {
      throw new Error("Unauthorized");
    }
    const encryptedRoomKey = (await encryptedRoomKeyRes.json()).roomKey;
    const accountKeyHash = JSON.parse(encryptedRoomKey).keyHash;
    const db = await createTakosDB();
    const accountKey = await db.get("accountKeys", accountKeyHash);
    if (!accountKey) {
      throw new Error("AccountKey not found");
    }
    const decryptedAccountKey = await decryptDataDeviceKey(
      deviceKeyVal,
      accountKey.encryptedKey,
    );
    console.log(decryptedAccountKey === null);
    if (!decryptedAccountKey) {
      throw new Error("Failed to decrypt accountKey");
    }
    const roomKeyResult = await decryptDataAccountKey(
      decryptedAccountKey,
      encryptedRoomKey,
    );
    if (!roomKeyResult) {
      throw new Error("Failed to decrypt roomKey");
    }
    roomKey = roomKeyResult;
    sessionStorage.setItem("roomKey-" + roomKeyHash, roomKey);
  }
  const decryptedMessage = await decryptDataRoomKey(
    roomKey,
    JSON.parse(encryptedMessage.message).value,
  );
  if (!decryptedMessage) {
    throw new Error("Failed to decrypt message");
  }
  return {
    verified: false,
    encrypted: true,
    content: JSON.parse(decryptedMessage).content,
    type: JSON.parse(decryptedMessage).type,
    timestamp: encryptedMessage.timestamp,
  };
}

interface Message {
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: string;
}
