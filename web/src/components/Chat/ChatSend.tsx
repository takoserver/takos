import {
  deviceKeyState,
  inputMessageState,
  isValidInputState,
} from "../../utils/state";
import { useAtom } from "solid-jotai";
import { createEffect, createSignal, Show } from "solid-js"; // Showをインポート
import { selectedChannelState, selectedRoomState } from "../../utils/roomState";
import imageCompression from "browser-image-compression";
import { generateThumbnailFromFile } from "../../utils/getVideoThumbnail";
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
import {
  createMediaContent,
  createTextContent,
  createThumbnailContent,
} from "../../utils/getMessage";
import EncryptionSettingsModal, {
  showEncryptionSettingsState,
} from "./EncryptionSettingsModal";
import {
  clearMentionReplyState,
  EVERYONE_MENTION_ID,
  mentionEveryone,
  mentionListState,
  replyTargetState,
} from "../../utils/mentionReply";
import MentionReplyDisplay from "../MentionReplyDisplay";

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
  const [showEncryptionSettings, setShowEncryptionSettings] = useAtom(
    showEncryptionSettingsState,
  );
  const [isSending, setIsSending] = createSignal(false);
  const [sendingProgress, setSendingProgress] = createSignal(0);
  const [currentOperation, setCurrentOperation] = createSignal("");
  const [mentionList] = useAtom(mentionListState);
  const [replyTarget] = useAtom(replyTargetState);

  // メッセージ送信を処理する関数
  const sendTextHandler = async () => {
    // 入力検証と必要な値の確認
    if (!isValidInput()) return;
    const input = inputMessage();
    if (!input) return;
    const textContent = createTextContent({
      text: input,
      format: "text",
    });
    // メンションリストからeveryoneを処理
    const mentionsToSend = mentionList().includes(EVERYONE_MENTION_ID)
      ? [EVERYONE_MENTION_ID] // everyoneが含まれている場合はそれだけを送信
      : mentionList();

    await sendHandler({
      type: "text",
      content: textContent,
      mention: mentionsToSend,
      reply: replyTarget()
        ? { id: replyTarget()!.id, content: replyTarget()?.content || "" }
        : null,
    });

    // 送信後にメンションとリプライ情報をクリア
    clearMentionReplyState();
  };

  const sendHandler = async ({
    type,
    content,
    mention = [],
    reply = null,
    original = null,
    isLarge = false,
  }: {
    type: "text" | "file" | "image" | "thumbnail" | "video";
    content: string;
    mention?: string[];
    reply?: { id: string; content: string } | null;
    original?: string | null;
    isLarge?: boolean;
  }) => {
    try {
      // 大きいファイルの場合、送信状態を設定
      if (isLarge) {
        setIsSending(true);
        setCurrentOperation("メッセージを準備中...");
      }

      const room = selectedRoom();
      if (!room?.roomid) return;
      const deviceKeyVal = deviceKey();
      if (!deviceKeyVal) return;

      setCurrentOperation("暗号化キーを確認中...");
      const { decryptedIdentityKey, latestIdentityKey } = await getIdentityKeys(
        deviceKeyVal,
      );
      if (!decryptedIdentityKey) {
        setIsSending(false);
        return;
      }

      const roomKey = await getRoomKeyOrCreate({
        room,
        deviceKeyVal,
        decryptedIdentityKey,
        latestIdentityKey,
      });
      if (!roomKey) {
        setIsSending(false);
        return;
      }

      const channel = room.type === "friend" ? "friend" : selectedChannel();
      if (!channel) {
        setIsSending(false);
        return;
      }

      const processedReply = reply ? { id: reply.id } : undefined;
      const processedOriginal = original ? original : undefined;

      setCurrentOperation("メッセージを暗号化中...");
      setSendingProgress(50);

      const encrypted = await encryptMessage(
        {
          type,
          content: content,
          channel,
          timestamp: new Date().getTime(),
          isLarge,
          mention,
          reply: processedReply,
          original: processedOriginal,
        },
        roomKey,
        {
          privateKey: decryptedIdentityKey.privateKey,
          pubKeyHash: latestIdentityKey.key,
        },
        room.roomid,
      );
      if (!encrypted) {
        setIsSending(false);
        return;
      }

      setCurrentOperation("メッセージを送信中...");
      setSendingProgress(80);

      const success = await sendEncryptedMessage({
        roomId: room.roomid,
        message: encrypted.message,
        sign: encrypted.sign,
        type: room.type,
        channelId: channel,
      });

      // 送信処理完了時に状態をリセット
      setIsSending(false);
      setSendingProgress(0);

      if (success) {
        setInputMessage("");
      }
      if (success.status === false) {
        console.error("メッセージ送信に失敗しました");
        return;
      }
      return success.messageId;
    } catch (error) {
      console.error("メッセージ送信中にエラーが発生しました:", error);
      // エラー時も送信状態をリセット
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  // ID鍵を取得する
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

  /*
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
    if (res.status == 200) {
      const body = await res.json();
      return { status: true, messageId: body.messageId };
    } else {
      return { status: false };
    }
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
  const [menuPosition, setMenuPosition] = createSignal("left");

  // メニュー表示切り替え処理を修正
  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation();

    // ボタンの位置を取得して画面端からの距離を計算
    const buttonElement = e.currentTarget as HTMLElement;
    const rect = buttonElement.getBoundingClientRect();
    const distanceFromRight = window.innerWidth - rect.right;

    // 右端から250px以内の場合は右揃えに切り替え (w-48 = 12rem = ~192px + 余裕)
    if (distanceFromRight < 250) {
      setMenuPosition("right");
    } else {
      setMenuPosition("left");
    }

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

  const handleMediaSelect = () => {
    // 画像・動画選択処理
    console.log("メディア選択");
    setIsMenuOpen(false);

    // ファイル入力要素の作成
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,video/*"; // 画像と動画ファイルを許可
    fileInput.style.display = "none";

    // ファイル選択イベントハンドラを設定
    fileInput.addEventListener("change", async (event) => {
      console.log("ファイル選択完了");
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      try {
        // ファイルタイプを確認
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (!isVideo && !isImage) {
          console.error("サポートされていないファイル形式です");
          return;
        }

        // ファイルサイズをメガバイト単位で計算
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`ファイルサイズ: ${fileSizeMB.toFixed(2)}MB`);

        if (isImage) {
          // 画像処理 - 既存コード
          await handleImageFile(file);
        } else if (isVideo) {
          // 動画処理 - 新規追加
          await handleVideoFile(file);
        }
      } catch (error) {
        console.error("メディア処理中にエラーが発生しました:", error);
      }
    });

    // bodyに追加して自動的にクリックイベントを発火
    document.body.appendChild(fileInput);
    fileInput.click();

    // 使用後にDOMから削除
    setTimeout(() => {
      document.body.removeChild(fileInput);
    }, 3000);
  };

  // 画像ファイル処理関数
  const handleImageFile = async (file: File) => {
    const fileSizeKB = file.size / 1024;

    if (fileSizeKB > 256) {
      setIsSending(true);
      setCurrentOperation("画像を処理中...");
      setSendingProgress(10);

      const base64Image = await readFileAsBase64(file);
      setSendingProgress(30);

      const replaced = base64Image.replace(/^data:.*?;base64,/, "");
      const contentRaw = createMediaContent({
        uri: replaced,
        metadata: {
          filename: file.name,
          mimeType: file.type,
        },
      });

      setSendingProgress(50);
      setCurrentOperation("元の画像を送信中...");

      const big = contentRaw;
      const messageId = await sendHandler({
        type: "image",
        content: big,
        isLarge: true,
      });

      setSendingProgress(70);
      setCurrentOperation("サムネイルを生成中...");

      const resizedImage = (await resizeBase64Image(base64Image, 256)).replace(
        /^data:.*?;base64,/,
        "",
      );
      const content = createThumbnailContent({
        originalType: "image",
        thumbnailMimeType: file.type,
        thumbnailUri: resizedImage,
      });

      setCurrentOperation("サムネイルを送信中...");
      setSendingProgress(90);

      await sendHandler({
        type: "thumbnail",
        content,
        isLarge: false,
        original: messageId,
      });

      setIsSending(false);
      setSendingProgress(0);
    } else {
      // 256KB以下の場合は圧縮せずに送信
      console.log("画像サイズが256KB以下のため圧縮せずに送信します");
      const base64Data = await readFileAsBase64(file, true);
      const content = createMediaContent({
        uri: base64Data,
        metadata: {
          filename: file.name,
          mimeType: file.type,
        },
      });
      await sendHandler({
        type: "image",
        content,
      });
    }
  };

  // 動画ファイル処理関数
  const handleVideoFile = async (file: File) => {
    const maxVideoSizeMB = 10000;
    const fileSizeMB = file.size / (1024 * 1024);
    const fileSizeKB = file.size / 1024;

    if (fileSizeMB > maxVideoSizeMB) {
      console.error(`動画サイズが上限（${maxVideoSizeMB}MB）を超えています`);
      return;
    }

    // 256KB以下の場合は圧縮せずにサムネイルなしで直接送信
    if (fileSizeKB <= 256) {
      console.log("動画サイズが256KB以下のため圧縮せずに送信します");
      const base64Data = await readFileAsBase64(file, true);
      const content = createMediaContent({
        uri: base64Data,
        metadata: {
          filename: file.name,
          mimeType: file.type,
        },
      });
      await sendHandler({
        type: "video",
        content,
      });
      return;
    }

    // 256KB以上の場合の処理
    setIsSending(true);
    setCurrentOperation("動画を処理中...");
    setSendingProgress(10);

    const base64Video = await readFileAsBase64(file);
    setSendingProgress(40);

    const videoContent = base64Video.replace(/^data:.*?;base64,/, "");
    setCurrentOperation("動画を送信中...");
    setSendingProgress(50);

    // 元の動画を送信
    const messageId = await sendHandler({
      type: "video",
      content: createMediaContent({
        uri: videoContent,
        metadata: {
          filename: file.name,
          mimeType: file.type,
        },
      }),
      isLarge: true,
    });

    // 動画のサムネイル生成と送信
    try {
      setCurrentOperation("サムネイルを生成中...");
      setSendingProgress(80);

      const thumbnailBase64 = await generateThumbnailFromFile(file, 0);
      // 256KB以上の場合は圧縮
      let resizedThumbnailBase64 = thumbnailBase64;
      if (getBase64SizeKB(thumbnailBase64) > 256) {
        resizedThumbnailBase64 = await resizeBase64Image(thumbnailBase64, 256);
      }

      setCurrentOperation("サムネイルを送信中...");
      setSendingProgress(90);

      const thumbnailContent = createThumbnailContent({
        originalType: "video",
        thumbnailMimeType: "image/jpeg",
        thumbnailUri: resizedThumbnailBase64.replace(/^data:.*?;base64,/, ""),
      });
      await sendHandler({
        type: "thumbnail",
        content: thumbnailContent,
        isLarge: false,
        original: messageId,
      });
    } catch (err) {
      console.error("動画サムネイル生成に失敗しました:", err);
    } finally {
      setIsSending(false);
      setSendingProgress(0);
    }
  };

  // ファイルをBase64に変換するユーティリティ関数
  const readFileAsBase64 = (
    file: File,
    stripPrefix = false,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (stripPrefix) {
          const base64Data = dataUrl.replace(/^data:.*?;base64,/, "");
          resolve(base64Data);
        } else {
          resolve(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleExcludeSettings = () => {
    setIsMenuOpen(false);
  };

  const handleShowEncryptedUsers = () => {
    setIsMenuOpen(false);
  };

  // 暗号化設定モーダルを表示
  const openEncryptionSettings = (e?: Event) => {
    // イベントがある場合はデフォルト動作を防止
    if (e) {
      e.preventDefault();
    }
    setIsMenuOpen(false);
    setShowEncryptionSettings(true);
  };

  // メニュー項目に「全員をメンション」ボタンを追加
  const menuItems = [
    {
      label: "ファイル",
      icon: (
        <svg
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
      ),
      onClick: handleFileSelect,
    },
    {
      label: "全員をメンション",
      icon: (
        <svg
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
          <path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-6"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      onClick: () => {
        mentionEveryone();
        setIsMenuOpen(false);
      },
    },
    {
      label: "暗号化設定",
      icon: (
        <svg
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
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path
            d={isEncrypted()
              ? "M7 11V7a5 5 0 0 1 10 0v4"
              : "M7 11V7a5 5 0 0 1 9.9-1"}
          >
          </path>
        </svg>
      ),
      onClick: openEncryptionSettings,
    },
  ];

  return (
    <div class="p-talk-chat-send relative">
      {/* メンションとリプライ表示コンポーネント */}
      <MentionReplyDisplay />

      <form class="p-talk-chat-send__form" onSubmit={(e) => e.preventDefault()}>
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
              class={`absolute bottom-12 ${
                menuPosition() === "right" ? "right-0" : "left-0"
              } bg-[#333333] rounded-md shadow-lg py-2 w-48 z-50 ${
                isMenuOpen() ? "block" : "hidden"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map((item) => (
                <button
                  type="button"
                  class="w-full text-left px-4 py-2 hover:bg-[#444444] flex items-center"
                  onClick={item.onClick}
                >
                  <span class="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 画像ボタン */}
          <div
            class="mr-2 p-2 cursor-pointer hover:bg-[#2e2e2e] rounded-full transition-colors"
            onClick={handleMediaSelect}
            title="写真・動画を送信"
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
      <EncryptionSettingsModal
        isOpen={showEncryptionSettings()}
        onClose={() => setShowEncryptionSettings(false)}
        isEncrypted={isEncrypted()}
        onToggleEncryption={toggleEncryption}
      />

      {/* 送信中プログレスバー表示 */}
      <Show when={isSending()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-[#333] p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 class="text-xl mb-3">ファイル送信中...</h3>
            <p class="mb-4">{currentOperation()}</p>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
              <div
                class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${sendingProgress()}%` }}
              >
              </div>
            </div>
          </div>
        </div>
      </Show>
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
      console.log(
        !!friendMasterKey,
        !!friendAccountKey,
        !!friendAccountKeySign,
      );
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

async function resizeBase64Image(
  base64: string,
  maxSizeKB: number = 256,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img: HTMLImageElement = new Image();
    img.onload = async function () {
      const canvas: HTMLCanvasElement = document.createElement("canvas");
      const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas context is not supported"));
        return;
      }

      let width: number = img.width;
      let height: number = img.height;

      // 初期の canvas サイズ設定
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let quality: number = 0.9; // 初期圧縮率
      let resultBase64: string = canvas.toDataURL("image/jpeg", quality);

      // 256KB 以下になるように調整
      while (getBase64SizeKB(resultBase64) > maxSizeKB && quality > 0.1) {
        quality -= 0.05;
        resultBase64 = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(resultBase64);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = base64;
  });
}

// Base64 のサイズを KB 単位で取得
function getBase64SizeKB(base64: string): number {
  return Math.round((base64.length * 3) / 4 / 1024);
}
