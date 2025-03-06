import { createSignal } from "solid-js";
import { ContextMenu } from "./ContextMenu";
import { convertLineBreak, convertTime, renderMessageContent } from "./OtherMessage";

const userId = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;

const ChatSendMessage = (
  { time, content, isPrimary, isSendPrimary, messageid }: {
    time: string | number | Date;
    content: {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: string;
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
  const copyMessage = () => {
    if (content.content) {
      navigator.clipboard.writeText(content.content)
        .then(() => alert("メッセージをクリップボードにコピーしました"))
        .catch((err) => console.error("コピーに失敗しました:", err));
    }
  };

  // メッセージを削除
  const deleteMessage = async () => {
    if (confirm("このメッセージを削除しますか？")) {
      try {
        // TODO: メッセージ削除APIの実装
        console.log("メッセージ削除:", messageid);
      } catch (error) {
        console.error("メッセージ削除エラー:", error);
      }
    }
  };

  // メニュー項目の定義
  const menuItems = [
    { label: "メッセージをコピー", onClick: copyMessage },
    { label: "メッセージを削除", onClick: deleteMessage, danger: true },
  ];

  return (
    <li class={isPrimaryClass}>
      <div
        class="c-talk-chat-box mb-[3px]"
        onContextMenu={handleContextMenu}
      >
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
        <div class="c-talk-chat-right">
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