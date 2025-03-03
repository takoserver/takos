import {
  deviceKeyState,
  inputMessageState,
  isValidInputState,
} from "../../utils/state";
import { useAtom } from "solid-jotai";
import { createEffect, createSignal } from "solid-js";
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
import { createTakosDB, decryptIdentityKey } from "../../utils/idb";
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
  /**
   * メッセージ送信を処理する関数
   */
  const sendTextHandler = async () => {
    // 入力検証と必要な値の確認
    if (!isValidInput()) return;
    const input = inputMessage();
    if (!input) return;
    // メッセージ送信
    await sendHandler({
      type: "text",
      content: input,
    });
  };

  const sendHandler = async ({
    type,
    content,
  }: {
    type: "text" | "file" | "image";
    content: string;
  }) => {
    try {
      const room = selectedRoom();
      if (!room?.roomid) return;
      const deviceKeyVal = deviceKey();
      if (!deviceKeyVal) return;
      const { decryptedIdentityKey, latestIdentityKey } = await getIdentityKeys(
        deviceKeyVal,
      );
      if (!decryptedIdentityKey) return;
      const roomKey = await getRoomKeyOrCreate({
        room,
        deviceKeyVal,
        decryptedIdentityKey,
        latestIdentityKey,
      });
      if (!roomKey) return;
      const channel = room.type === "friend" ? "friend" : selectedChannel();
      if (!channel) return;
      const encrypted = await encryptMessage(
        {
          type,
          content: content,
          channel,
          timestamp: new Date().getTime(),
          isLarge: false,
        },
        roomKey,
        {
          privateKey: decryptedIdentityKey.privateKey,
          pubKeyHash: latestIdentityKey.key,
        },
        room.roomid,
      );
      if (!encrypted) return;

      // メッセージ送信
      const success = await sendEncryptedMessage({
        roomId: room.roomid,
        message: encrypted.message,
        sign: encrypted.sign,
        type: room.type,
        channelId: channel,
      });

      if (success) {
        setInputMessage("");
      }
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
    }
  };

  /**
   * ID鍵を取得する
   */
  const getIdentityKeys = async (deviceKeyVal: string) => {
    const db = await createTakosDB();
    const identityKeys = await db.getAll("identityKeys");
    const latestIdentityKey =
      identityKeys.sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!latestIdentityKey) {
      setShowIdentityKeyPopUp(true);
      return { decryptedIdentityKey: null, latestIdentityKey: null };
    }

    const decryptedIdentityKey = await decryptIdentityKey({
      deviceKey: deviceKeyVal,
      encryptedIdentityKey: latestIdentityKey.encryptedKey,
    });

    return { decryptedIdentityKey, latestIdentityKey };
  };

  /**
   * ルームキーを取得または新規作成する
   */
  const getRoomKeyOrCreate = async (
    { room, deviceKeyVal, decryptedIdentityKey, latestIdentityKey }: {
      room: { roomid: string; type: string };
      deviceKeyVal: string;
      decryptedIdentityKey: any;
      latestIdentityKey: any;
    },
  ) => {
    const db = await createTakosDB();
    const roomKeys = await db.getAll("RoomKeys");
    const encryptedRoomKey = roomKeys
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter((key) => key.roomid === room.roomid)[0];

    if (!encryptedRoomKey) {
      return createNewRoomKey(
        room,
        decryptedIdentityKey,
        latestIdentityKey,
        deviceKeyVal,
      );
    }

    // 既存キーの復号を試みる
    let latestRoomKey;
    try {
      latestRoomKey = await decryptDataDeviceKey(
        deviceKeyVal,
        encryptedRoomKey.encryptedKey,
      );
    } catch (error) {
      return createNewRoomKey(
        room,
        decryptedIdentityKey,
        latestIdentityKey,
        deviceKeyVal,
      );
    }

    // キーの再利用可否をチェック
    if (shouldCreateNewRoomKey(room, latestRoomKey, encryptedRoomKey)) {
      return createNewRoomKey(
        room,
        decryptedIdentityKey,
        latestIdentityKey,
        deviceKeyVal,
      );
    }

    return latestRoomKey;
  };

  /**
   * 新しいルームキーを作成するべきかチェック
   */
  const shouldCreateNewRoomKey = (
    room: { roomid?: string; type: any },
    latestRoomKey: string | null,
    encryptedRoomKey: {
      key?: string;
      encryptedKey?: string;
      timestamp: any;
      roomid?: string;
      metaData: any;
    },
  ) => {
    // キー有効期限切れチェック (10分)
    if (encryptedRoomKey.timestamp < new Date().getTime() - 1000 * 60 * 10) {
      return true;
    }

    // グループチャットのメンバー変更チェック
    if (room.type === "group" && latestRoomKey) {
      const previousMembers = JSON.parse(encryptedRoomKey.metaData).sharedUser
        .map((user: { userId: any }) => user.userId);

      const currentMembers = groupChannel()?.members
        .map((user) => user.userId);

      if (!previousMembers || !currentMembers) return true;
      if (previousMembers.length !== currentMembers.length) return true;

      // メンバーに変更があるか確認
      for (const member of previousMembers) {
        if (!currentMembers.includes(member)) {
          console.log("メンバーが変更されたため、新しいroomKeyを作成します");
          return true;
        }
      }
    }

    return false;
  };

  /**
   * 新しいルームキーを作成
   */
  const createNewRoomKey = async (
    room: { roomid: any; type: any },
    decryptedIdentityKey: { privateKey: string },
    latestIdentityKey: { key: string },
    deviceKeyVal: string,
  ) => {
    const roomId = room.roomid;

    if (room.type === "friend") {
      const match = roomId.match(/^m\{([^}]+)\}@(.+)$/);
      if (!match) return null;

      const friendUserName = match[1];
      const domainFromRoom = match[2];

      return createRoomKey(
        roomId,
        [`${friendUserName}@${domainFromRoom}`],
        userId,
        decryptedIdentityKey.privateKey,
        latestIdentityKey.key,
        deviceKeyVal,
        "friend",
      );
    }

    if (room.type === "group") {
      const friendIds = groupChannel()?.members.map((user) => user.userId);
      if (!friendIds) return null;

      return createRoomKey(
        roomId,
        friendIds,
        userId,
        decryptedIdentityKey.privateKey,
        latestIdentityKey.key,
        deviceKeyVal,
        "group",
      );
    }

    return null;
  };

  /**
   * 暗号化されたメッセージを送信
   */
  const sendEncryptedMessage = async (
    { roomId, message, sign, type, channelId }: {
      roomId: string;
      message: any;
      sign: any;
      type: string;
      channelId: string;
    },
  ) => {
    const res = await fetch("./api/v2/message/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomId,
        message,
        sign,
        type,
        channelId,
      }),
    });

    return res.status === 200;
  };
  // 暗号化設定状態を管理
  const [isEncrypted, setIsEncrypted] = createSignal(true);
  // メニュー表示状態を管理
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);

  // 暗号化切り替え処理
  const toggleEncryption = () => {
    setIsEncrypted(!isEncrypted());
  };

  // メニュー表示切り替え処理
  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen());
  };

  // メニュー外クリックで閉じる
  const closeMenu = () => {
    if (isMenuOpen()) {
      setIsMenuOpen(false);
    }
  };

  // コンポーネントのマウント時にドキュメント全体のクリックイベントを設定
  createEffect(() => {
    if (isMenuOpen()) {
      document.addEventListener("click", closeMenu);
    } else {
      document.removeEventListener("click", closeMenu);
    }

    // クリーンアップ関数
    return () => {
      document.removeEventListener("click", closeMenu);
    };
  });

  const handleFileSelect = () => {
    console.log("ファイル選択");
    setIsMenuOpen(false);
  };

  const handleImageSelect = () => {
    //画像選択処理 FileAPIを使用
    console.log("画像選択");
    setIsMenuOpen(false);

    // ファイル入力要素の作成
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*"; // 画像ファイルのみ許可
    fileInput.style.display = "none";

    // ファイル選択イベントハンドラを設定
    fileInput.addEventListener("change", async (event) => {
      console.log("画像選択完了");
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        try {
          // 画像ファイルをリサイズして Base64 に変換
          const base64Image = await resizeAndConvertToBase64(
            file,
            256,
            800,
            800,
          );
          console.log("画像を変換しました", file.name);

          // 画像メッセージとして送信
          await sendHandler({
            type: "image",
            content: base64Image,
          });
        } catch (error) {
          console.error("画像処理中にエラーが発生しました:", error);
        }
      }
    });

    // bodyに追加して自動的にクリックイベントを発火
    document.body.appendChild(fileInput);
    fileInput.click();

    // 使用後にDOMから削除（少し遅延させる）
    setTimeout(() => {
      document.body.removeChild(fileInput);
    }, 3000); // 3秒後に削除（時間を長くして確実にイベントが処理されるようにする）
  };

  const handleExcludeSettings = () => {
    setIsMenuOpen(false);
  };

  const handleShowEncryptedUsers = () => {
    setIsMenuOpen(false);
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
                  sendTextHandler();
                }
              }}
            >
            </textarea>
          </label>
        </div>
        <div class="flex items-center">
          {/* メニューボタン */}
          <div class="relative">
            <div
              class="p-2 cursor-pointer hover:bg-[#2e2e2e] rounded-full transition-colors mr-2"
              onClick={toggleMenu}
              title="メニューを開く"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>

            {/* ドロップダウンメニュー */}
            <div
              class={`absolute bottom-12 left-0 bg-[#333333] rounded-md shadow-lg py-2 w-48 z-50 ${
                isMenuOpen() ? "block" : "hidden"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                class="w-full text-left px-4 py-2 hover:bg-[#444444] flex items-center"
                onClick={handleFileSelect}
              >
                <svg
                  class="mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z">
                  </path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                ファイル
              </button>
              <button
                class="w-full text-left px-4 py-2 hover:bg-[#444444] flex items-center"
                onClick={toggleEncryption}
              >
                <svg
                  class="mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isEncrypted() ? "#4CAF50" : "#F44336"}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2">
                  </rect>
                  <path
                    d={isEncrypted()
                      ? "M7 11V7a5 5 0 0 1 10 0v4"
                      : "M7 11V7a5 5 0 0 1 9.9-1"}
                  >
                  </path>
                </svg>
                暗号化設定: {isEncrypted() ? "オン" : "オフ"}
              </button>
              <button
                class="w-full text-left px-4 py-2 hover:bg-[#444444] flex items-center"
                onClick={handleExcludeSettings}
              >
                <svg
                  class="mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                暗号化除外設定
              </button>
              <button
                class="w-full text-left px-4 py-2 hover:bg-[#444444] flex items-center"
                onClick={handleShowEncryptedUsers}
              >
                <svg
                  class="mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                暗号化ユーザー表示
              </button>
            </div>
          </div>

          {/* 画像ボタン */}
          <div
            class="mr-2 p-2 cursor-pointer hover:bg-[#2e2e2e] rounded-full transition-colors"
            onClick={handleImageSelect}
            title="画像を送信"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          {/* 送信ボタン */}
          <div
            class={isValidInput()
              ? "p-talk-chat-send__button is-active"
              : "p-talk-chat-send__button"}
            onClick={sendTextHandler}
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
        </div>
      </form>
    </div>
  );
}
export default ChatSend;

/**
 * ルームキーを作成し、友達と共有する
 */
async function createRoomKey(
  roomId: string,
  friendIds: string[],
  userId: string,
  identityKey: string,
  idenPubkeyHash: string,
  deviceKey: string,
  roomType: "friend" | "group",
): Promise<string | undefined> {
  try {
    // セッションUUIDの確認
    const uuid = localStorage.getItem("sessionUUID");
    if (!uuid) {
      console.error("セッションUUIDが見つかりません");
      return undefined;
    }

    // ルームキーの生成
    const roomKey = await generateRoomkey(uuid);
    if (!roomKey) {
      console.error("ルームキーの生成に失敗しました");
      return undefined;
    }

    // データベース接続
    const db = await createTakosDB();

    // 自分のIDを友達リストから除外
    const targetFriendIds = friendIds.filter((id) => id !== userId);

    // 友達のキー情報を収集
    const friendKeys = await collectFriendKeys(targetFriendIds, db);

    // 自分のキー情報を取得
    const myKeyInfo = await getMyKeyInfo(userId, deviceKey, db);
    if (!myKeyInfo) {
      console.error("自分のキー情報の取得に失敗しました");
      return undefined;
    }

    // 全てのキー情報を結合
    const allKeys = [...friendKeys, myKeyInfo];

    // ルームキーの暗号化
    const encrypted = await encryptRoomKeyWithAccountKeys(
      allKeys,
      roomKey,
      identityKey,
      idenPubkeyHash,
    );
    if (!encrypted) {
      console.error("ルームキーの暗号化に失敗しました");
      return undefined;
    }

    // ルームキーの送信
    const success = await sendRoomKey(roomId, encrypted, roomKey, roomType);
    if (!success) {
      console.error("ルームキーの送信に失敗しました");
      return undefined;
    }

    // ルームキーをデバイスキーで暗号化して保存
    await storeRoomKey(db, roomId, roomKey, deviceKey, encrypted.metadata);
    return roomKey;
  } catch (error) {
    console.error("ルームキー作成中にエラーが発生しました:", error);
    return undefined;
  }
}

/**
 * 友達のキー情報を収集する
 */
async function collectFriendKeys(
  friendIds: string[],
  db: any,
): Promise<
  Array<{
    masterKey: string;
    accountKey: string;
    accountKeySign: string;
    userId: string;
    isVerify: boolean;
  }>
> {
  console.log(friendIds);
  const allowKeysData = await db.getAll("allowKeys");
  const friendKeys = [];

  for (const friendId of friendIds) {
    try {
      const domain = friendId.split("@")[1];
      if (!domain) {
        console.error(`不正なユーザーID: ${friendId}`);
        continue;
      }

      // 友達のマスターキーとアカウントキーを取得
      const [friendMasterKeyRes, friendAccountKeyRes] = await Promise.all([
        fetch(`https://${domain}/_takos/v1/key/masterKey?userId=${friendId}`),
        fetch(`https://${domain}/_takos/v1/key/accountKey?userId=${friendId}`),
      ]);

      if (
        friendMasterKeyRes.status !== 200 || friendAccountKeyRes.status !== 200
      ) {
        console.error(`${friendId}のキー情報取得に失敗しました`);
        continue;
      }

      const friendMasterKey = (await friendMasterKeyRes.json()).key;
      const { key: friendAccountKey, signature: friendAccountKeySign } =
        await friendAccountKeyRes.json();

      // 許可されたキーの更新
      const allowKey = allowKeysData.find((
        k: { userId: string; latest: any },
      ) => k.userId === friendId && k.latest);
      if (allowKey && allowKey.key !== await keyHash(friendMasterKey)) {
        await db.put("allowKeys", {
          key: allowKey.key,
          userId: allowKey.userId,
          timestamp: allowKey.timestamp,
          latest: false,
        });
      }

      // マスターキーの検証
      if (
        !verifyMasterKey(
          friendMasterKey,
          friendAccountKeySign,
          friendAccountKey,
        )
      ) {
        console.error(`${friendId}のアカウントキーが不正です`);
        continue;
      }

      friendKeys.push({
        masterKey: friendMasterKey,
        accountKey: friendAccountKey,
        accountKeySign: friendAccountKeySign,
        userId: friendId,
        isVerify: true,
      });
    } catch (error) {
      console.error(
        `${friendId}のキー情報処理中にエラーが発生しました:`,
        error,
      );
    }
  }

  return friendKeys;
}

/**
 * 自分のキー情報を取得する
 */
async function getMyKeyInfo(
  userId: string,
  deviceKey: string,
  db: any,
): Promise<
  {
    masterKey: string;
    accountKey: string;
    accountKeySign: string;
    userId: string;
    isVerify: boolean;
  } | undefined
> {
  // マスターキーを取得
  const masterKey = localStorage.getItem("masterKey");
  if (!masterKey) {
    console.error("マスターキーが見つかりません");
    return undefined;
  }

  // デバイスキーでマスターキーを復号化
  const decryptMasterKey = await decryptDataDeviceKey(deviceKey, masterKey);
  if (!decryptMasterKey) {
    console.error("マスターキーの復号化に失敗しました");
    return undefined;
  }

  // 最新のアカウントキーを取得
  const accountKeys = await db.getAll("accountKeys");
  const encryptedAccountKey =
    accountKeys.sort((a: { timestamp: number }, b: { timestamp: number }) =>
      b.timestamp - a.timestamp
    )[0];
  if (!encryptedAccountKey) {
    console.error("アカウントキーが見つかりません");
    return undefined;
  }

  // アカウントキーの署名を取得
  const accountKeyRes = await fetch(
    `./_takos/v1/key/accountKey?userId=${userId}`,
  );
  if (accountKeyRes.status !== 200) {
    console.error("アカウントキーの署名取得に失敗しました");
    return undefined;
  }

  const accountKeyData = await accountKeyRes.json();

  // キーハッシュの検証
  if (await keyHash(accountKeyData.key) !== encryptedAccountKey.key) {
    console.error("アカウントキーのハッシュが一致しません");
    return undefined;
  }

  // マスターキーの検証
  const parsedMasterKey = JSON.parse(decryptMasterKey);
  if (
    !verifyMasterKey(
      parsedMasterKey.publicKey,
      accountKeyData.signature,
      accountKeyData.key,
    )
  ) {
    console.error("アカウントキーの検証に失敗しました");
    return undefined;
  }

  return {
    masterKey: parsedMasterKey.publicKey,
    accountKey: accountKeyData.key,
    accountKeySign: accountKeyData.signature,
    userId: userId,
    isVerify: true,
  };
}

/**
 * ルームキーをサーバーに送信する
 */
async function sendRoomKey(
  roomId: string,
  encrypted: {
    encryptedData: Array<{ userId: string; encryptedData: any }>;
    metadata: any;
    sign: string;
  },
  roomKey: string,
  roomType: "friend" | "group",
): Promise<boolean> {
  const res = await fetch("./api/v2/keys/roomKey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomId: roomId,
      encryptedRoomKeys: encrypted.encryptedData.map(
        (data) => [data.userId, data.encryptedData],
      ),
      hash: await keyHash(roomKey),
      metaData: encrypted.metadata,
      sign: encrypted.sign,
      type: roomType,
    }),
  });

  return res.status === 200;
}

/**
 * ルームキーをデータベースに保存する
 */
async function storeRoomKey(
  db: any,
  roomId: string,
  roomKey: string,
  deviceKey: string,
  metadata: any,
): Promise<void> {
  const encryptedRoomKey = await encryptDataDeviceKey(deviceKey, roomKey);
  if (!encryptedRoomKey) {
    throw new Error("ルームキーの暗号化に失敗しました");
  }
  await db.put("RoomKeys", {
    key: await keyHash(roomKey),
    encryptedKey: encryptedRoomKey,
    timestamp: new Date().getTime(),
    roomid: roomId,
    metaData: metadata,
  });
}

interface ResizeImageOptions {
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
}

function resizeAndConvertToBase64(
  file: File,
  maxSizeKB: number = 256,
  maxWidth: number = 800,
  maxHeight: number = 800,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader: FileReader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img: HTMLImageElement = new Image();
      img.onload = () => {
        let width: number = img.width;
        let height: number = img.height;
        let scale: number = Math.min(maxWidth / width, maxHeight / height, 1); // 縮小率を計算

        width *= scale;
        height *= scale;

        const canvas: HTMLCanvasElement = document.createElement("canvas");
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        let quality: number = 0.9; // 初期圧縮率
        let base64: string = "";

        // サイズチェックしながら圧縮
        do {
          base64 = canvas.toDataURL("image/jpeg", quality);
          quality -= 0.05; // 品質を下げる
        } while (base64.length > maxSizeKB * 1024 && quality > 0.1);

        // data:image/*;base64, プレフィックスを削除
        base64 = base64.replace(/^data:image\/\w+;base64,/, "");

        resolve(base64);
      };
      img.onerror = reject;
      img.src = event.target!.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
