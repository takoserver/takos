import {
  deviceKeyState,
  inputMessageState,
  isValidInputState,
} from "../../utils/state";
import { useAtom } from "solid-jotai";
import { createSignal } from "solid-js";
import { selectedChannelState, selectedRoomState } from "../../utils/roomState";
import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  encryptMessage,
  encryptRoomKeyWithAccountKeys,
  generateRoomkey,
  keyHash,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import {
  createTakosDB,
  getLatestIdentityKey,
  localStorageEditor,
} from "../../utils/idb";
import { shoowIdentityKeyPopUp } from "../CreateIdentityKeyPopUp";
import { groupChannelState } from "./SideBar";
const userId = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;
function ChatSend() {
  const [inputMessage, setInputMessage] = useAtom(inputMessageState);
  const [isValidInput, setIsValidInput] = useAtom(isValidInputState);
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [deviceKey] = useAtom(deviceKeyState);
  const [showIdentityKeyPopUp, setShowIdentityKeyPopUp] = useAtom(
    shoowIdentityKeyPopUp,
  );
  const [groupChannel, setGroupChannel] = useAtom(groupChannelState);
  const [selectedChannel] = useAtom(selectedChannelState);
  const sendHandler = async () => {
    if (!isValidInput()) return;
    const deviceKeyVal = deviceKey();
    if (!deviceKeyVal) return;
    const room = selectedRoom();
    const db = await createTakosDB();
    const identityKey = await db.getAll("identityKeys");
    const latestIdentityKey =
      identityKey.sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!latestIdentityKey) {
      setShowIdentityKeyPopUp(true);
      return;
    }
    const decryptIdentityKey = await decryptDataDeviceKey(
      deviceKeyVal,
      latestIdentityKey.encryptedKey,
    );
    if (!decryptIdentityKey) return;
    const roomKeys = await db.getAll("RoomKeys");
    const encryptedRoomKey = roomKeys.sort((a, b) => b.timestamp - a.timestamp)
      .filter((key) => key.roomid == selectedRoom()?.roomid)[0];
    let latestRoomKey;
    try {
      latestRoomKey = await decryptDataDeviceKey(
        deviceKeyVal,
        encryptedRoomKey.encryptedKey,
      );
    } catch (error) {
      latestRoomKey = null;
    }
    let isReUseRoomKey = true;
    if (selectedRoom()?.type === "group" && latestRoomKey) {
      const beforGroupMembers = JSON.parse(encryptedRoomKey.metaData).sharedUser
        .map((user: { userId: any }) => {
          return user.userId;
        });
      const nowMembers = groupChannel()?.members.map((user) => {
        return user.userId;
      });
      if (!beforGroupMembers || !nowMembers) return;
      if (beforGroupMembers.length !== nowMembers.length) {
        isReUseRoomKey = false;
      }
      for (const member of beforGroupMembers) {
        if (!nowMembers.includes(member)) {
          console.log("メンバーが変更されたため、新しいroomKeyを作成します");
          isReUseRoomKey = false;
        }
      }
    }
    if (!latestRoomKey || !isReUseRoomKey) {
      if (selectedRoom()?.type === "friend") {
        const roomId = selectedRoom()?.roomid;
        if (!roomId) return;
        const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
        if (!match) {
          return;
        }
        const friendUserName = match[1];
        const domainFromRoom = match[2];

        if (!roomId) return;
        latestRoomKey = await createRoomKey(
          roomId,
          [friendUserName + "@" + domainFromRoom],
          userId,
          decryptIdentityKey,
          latestIdentityKey.key,
          deviceKeyVal,
          "friend",
        );
      }
      if (selectedRoom()?.type === "group") {
        const friendIds = groupChannel()?.members.map((user) => {
          return user.userId;
        });
        const roomId = selectedRoom()?.roomid;
        if (!friendIds) return;
        if (!roomId) return;
        latestRoomKey = await createRoomKey(
          roomId,
          friendIds,
          userId,
          decryptIdentityKey,
          latestIdentityKey.key,
          deviceKeyVal,
          "group",
        );
      }
    }
    if (!latestRoomKey) return;
    let channel;
    if (room?.type === "friend") {
      channel = "friend";
    } else {
      channel = selectedChannel();
      if (!channel) return;
    }
    const encrypted = await encryptMessage(
      {
        type: "text",
        content: inputMessage(),
        channel: channel,
        timestamp: new Date().getTime(),
        isLarge: false,
      },
      latestRoomKey,
      {
        privateKey: decryptIdentityKey,
        pubKeyHash: latestIdentityKey.key,
      },
      selectedRoom()?.roomid as string,
    );
    if (!encrypted) return;
    const res = await fetch("./api/v2/message/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId: selectedRoom()?.roomid,
        message: encrypted.message,
        sign: encrypted.sign,
        type: room?.type,
        channelId: channel,
      }),
    });
    if (res.status !== 200) return;
    setInputMessage("");
  };
  return (
    <div class="p-talk-chat-send">
      <form class="p-talk-chat-send__form">
        <div class="p-talk-chat-send__msg">
          <div
            class="p-talk-chat-send__dummy"
            aria-hidden="true"
          >
            {inputMessage().split("\n").map((row) => (
              <>
                {row}
                <br />
              </>
            ))}
          </div>
          <label>
            <textarea
              class="p-talk-chat-send__textarea"
              placeholder="メッセージを入力"
              value={inputMessage()}
              onInput={(e) => {
                if (e.target) {
                  //0文字以上の場合はtrue
                  setIsValidInput(e.target.value.length > 0);
                  setInputMessage(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendHandler();
                }
              }}
            >
            </textarea>
          </label>
        </div>
        <div
          class={isValidInput()
            ? "p-talk-chat-send__button is-active"
            : "p-talk-chat-send__button"}
          onClick={sendHandler}
        >
          <svg
            width="800px"
            height="800px"
            viewBox="0 0 28 28"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="none" stroke-width="1" fill="none">
              <g fill="#000000">
                <path d="M3.78963301,2.77233335 L24.8609339,12.8499121 C25.4837277,13.1477699 25.7471402,13.8941055 25.4492823,14.5168992 C25.326107,14.7744476 25.1184823,14.9820723 24.8609339,15.1052476 L3.78963301,25.1828263 C3.16683929,25.4806842 2.42050372,25.2172716 2.12264586,24.5944779 C1.99321184,24.3238431 1.96542524,24.015685 2.04435886,23.7262618 L4.15190935,15.9983421 C4.204709,15.8047375 4.36814355,15.6614577 4.56699265,15.634447 L14.7775879,14.2474874 C14.8655834,14.2349166 14.938494,14.177091 14.9721837,14.0981464 L14.9897199,14.0353553 C15.0064567,13.9181981 14.9390703,13.8084248 14.8334007,13.7671556 L14.7775879,13.7525126 L4.57894108,12.3655968 C4.38011873,12.3385589 4.21671819,12.1952832 4.16392965,12.0016992 L2.04435886,4.22889788 C1.8627142,3.56286745 2.25538645,2.87569101 2.92141688,2.69404635 C3.21084015,2.61511273 3.51899823,2.64289932 3.78963301,2.77233335 Z">
                </path>
              </g>
            </g>
          </svg>
        </div>
      </form>
    </div>
  );
}
export default ChatSend;

async function createRoomKey(
  roomId: string,
  friendIds: string[],
  userId: string,
  identityKey: string,
  idenPubkeyHash: string,
  deviceKey: string,
  roomType: "friend" | "group",
) {
  const friendKeys: {
    masterKey: string;
    accountKeySign: string;
    accountKey: string;
    userId: string;
  }[] = [];
  const uuid = localStorage.getItem("sessionUUID");
  if (!uuid) return;
  const roomKey = await generateRoomkey(uuid);
  if (!roomKey) return;
  const db = await createTakosDB();
  const allowKeysData = await db.getAll("allowKeys");
  const userIdIndex = friendIds.indexOf(userId);
  if (userIdIndex !== -1) {
    friendIds.splice(userIdIndex, 1);
  }
  for (const friendId of friendIds) {
    const friendMasterKeyRes = await fetch(
      `https://${
        friendId.split("@")[1]
      }/_takos/v1/key/masterKey?userId=${friendId}`,
    );
    const frinedAccountKeyRes = await fetch(
      `https://${
        friendId.split("@")[1]
      }/_takos/v1/key/accountKey?userId=${friendId}`,
    );
    if (friendMasterKeyRes.status !== 200) {
      console.error(
        "友達のサーバーがダウンしているか、一方的に友達解除されました",
      );
      return;
    }
    if (frinedAccountKeyRes.status !== 200) {
      console.error(
        "友達のサーバーがダウンしているか、一方的に友達解除されました",
      );
      return;
    }
    const friendMasterKey = (await friendMasterKeyRes.json()).key;
    const { key: friendAccountKey, signature: friendAccountKeySign } =
      await frinedAccountKeyRes.json();
    const allowKeys = allowKeysData.filter((k) =>
      k.userId == friendId && k.latest
    )[0];
    if (allowKeys && allowKeys.key !== await keyHash(friendMasterKey)) {
      if (!friendId) return;
      await db.put("allowKeys", {
        key: allowKeys.key,
        userId: allowKeys.userId,
        timestamp: allowKeys.timestamp,
        latest: false,
      });
    }
    if (
      !verifyMasterKey(friendMasterKey, friendAccountKeySign, friendAccountKey)
    ) {
      console.error("友達のアカウントキーが不正です");
      continue;
    }
    friendKeys.push({
      masterKey: friendMasterKey,
      accountKey: friendAccountKey,
      accountKeySign: friendAccountKeySign,
      userId: friendId,
    });
  }
  const masterKey = localStorage.getItem("masterKey");
  if (!masterKey) return;
  const decryptMasterKey = await decryptDataDeviceKey(deviceKey, masterKey);
  if (!decryptMasterKey) return;
  const encryptedAccountKey =
    (await db.getAll("accountKeys")).sort((a, b) =>
      b.timestamp - a.timestamp
    )[0];
  if (!encryptedAccountKey) return;
  console.log(userId);
  const accountKeySign = await fetch(
    "./_takos/v1/key/accountKey?userId=" + userId,
  );
  if (accountKeySign.status !== 200) return;
  const accountKeySignJson = await accountKeySign.json();
  if (await keyHash(accountKeySignJson.key) !== encryptedAccountKey.key) return;
  if (
    !verifyMasterKey(
      JSON.parse(decryptMasterKey).publicKey,
      accountKeySignJson.signature,
      accountKeySignJson.key,
    )
  ) return;
  //ドメインを取得 現在のサイトの
  const domain = new URL(window.location.href).hostname;
  friendKeys.push({
    masterKey: JSON.parse(decryptMasterKey).publicKey,
    accountKey: accountKeySignJson.key,
    accountKeySign: accountKeySignJson.signature,
    userId: userId,
  });
  const encrypted = await encryptRoomKeyWithAccountKeys(
    friendKeys,
    roomKey,
    identityKey,
    idenPubkeyHash,
  );
  if (!encrypted) return;
  const res = await fetch("./api/v2/keys/roomKey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomId: roomId,
      encryptedRoomKeys: encrypted.encryptedData.map((data) => {
        return [data.userId, data.encryptedData];
      }),
      hash: await keyHash(roomKey),
      metaData: encrypted.metadata,
      sign: encrypted.sign,
      type: roomType,
    }),
  });
  if (res.status !== 200) return;
  const encryptedRoomKey = await encryptDataDeviceKey(deviceKey, roomKey);
  if (!encryptedRoomKey) return;
  await db.put("RoomKeys", {
    key: await keyHash(roomKey),
    encryptedKey: encryptedRoomKey,
    timestamp: new Date().getTime(),
    roomid: roomId,
    metaData: encrypted.metadata,
  });
  alert("roomKeyを送信しました");
  return roomKey;
}
