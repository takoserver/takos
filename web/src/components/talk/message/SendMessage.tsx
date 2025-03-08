import { createSignal } from "solid-js";
import { ContextMenu } from "./ContextMenu.tsx";
import {
  convertTime,
  copyMessageContent,
} from "../../../utils/message/messageUtils.tsx";
import { renderMessageContent } from "./MessageContent.tsx";
import { setReplyToMessage } from "../../../utils/message/mentionReply.ts";

const userId = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;

const ChatSendMessage = (
  { time, content, isPrimary, isSendPrimary, messageid }: {
    time: string | number | Date;
    content: {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: "text" | "image" | "video" | "audio" | "file";
      timestamp: string | number | Date;
      original?: string | undefined;
    };
    messageid: string;
    isPrimary: boolean;
    isSendPrimary: boolean;
  },
) => {
  const isPrimaryClass = `c-talk-chat self ${
    isPrimary ? "primary" : "subsequent"
  }${isSendPrimary ? " mt-2" : ""}`;

  // 右クリックメニュー用の状態
  const [showContextMenu, setShowContextMenu] = createSignal(false);
  const [contextMenuPosition, setContextMenuPosition] = createSignal({
    x: 0,
    y: 0,
  });

  // 右クリックイベントハンドラ
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // メッセージをコピー
  const copyMessage = async () => {
    const success = await copyMessageContent(content);
    if (success) {
      alert("メッセージをクリップボードにコピーしました");
    } else {
      alert("メッセージのコピーに失敗しました");
    }
  };

  // メッセージを削除
  const deleteMessage = async () => {
    if (confirm("このメッセージを削除しますか？")) {
      try {
        const res = await fetch("/api/v2/message/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageId: messageid }),
        });
        if (!res.ok) {
          throw new Error("メッセージ削除に失敗しました");
        }
        console.log("メッセージ削除:", messageid);
      } catch (error) {
        console.error("メッセージ削除エラー:", error);
      }
    }
  };

  // メニュー項目の定義
  const menuItems = [
    { label: "メッセージをコピー", onClick: copyMessage },
    {
      label: "リプライ",
      onClick: () => {
        setReplyToMessage(messageid, content.type, content.content);
        setShowContextMenu(false);
      },
    },
    { label: "メッセージを削除", onClick: deleteMessage, danger: true },
  ];

  return (
    <li class={isPrimaryClass}>
      <div
        class="c-talk-chat-box mb-[3px] max-w-full"
        onContextMenu={handleContextMenu}
      >
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
        <div class="c-talk-chat-right max-w-[calc(100%-45px)]">
          <p>
            {renderMessageContent(content, userId)}
          </p>
        </div>
      </div>

      {/* 右クリックメニュー */}
      {showContextMenu() && (
        <ContextMenu
          x={contextMenuPosition().x}
          y={contextMenuPosition().y}
          items={menuItems}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </li>
  );
};

export default ChatSendMessage;
