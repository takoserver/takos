import { createSignal } from "solid-js";
import { ContextMenu } from "./ContextMenu";

const ChatSendMessage = (
  { time, content, isPrimary, isSendPrimary, messageid }: {
    time: string | number | Date;
    content: {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: string;
      timestamp: string | number | Date;
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
            {content.type === "image"
              ? (
                <img
                  src={`data:image/png;base64,${content.content}`}
                  alt="送信された画像"
                  class="max-w-full max-h-64 rounded"
                  style={{ "user-select": "none" }}
                />
              )
              : (
                <div class="c-talk-chat-msg" style={{ "user-select": "none" }}>
                  <p>
                    {convertLineBreak(content.content)}
                  </p>
                </div>
              )}
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

function convertTime(time: string | number | Date) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "午後" : "午前";
  const hour = hours % 12;
  const zeroPaddingHour = hour === 0 ? 12 : hour;
  const zeroPaddingMinutes = String(minutes).padStart(2, "0");
  return `${ampm} ${zeroPaddingHour}:${zeroPaddingMinutes}`;
}

//preactで動作する改行を反映させるために、改行コードをbrタグに変換する関数
function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  return message.split("\n").map((line) => (
    <span>
      {line}
      <br />
    </span>
  ));
}
