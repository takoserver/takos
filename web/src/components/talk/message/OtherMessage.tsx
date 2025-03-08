import { createEffect, createSignal } from "solid-js";
import { useAtom } from "solid-jotai";
import { DEFAULT_ICON } from "../../utils/defaultIcon.ts";
import { iconsState, nickNamesState } from "../../../utils/state.ts";
import { ContextMenu } from "./ContextMenu.tsx";
import { getMessage } from "../../../utils/message/getMessage.ts";
import { selectedRoomState } from "../../../utils/room/roomState.ts";
import {
  convertTime,
  copyMessageContent,
} from "../../../utils/message/messageUtils.tsx";

import { renderMessageContent } from "./MessageContent.tsx";
import {
  mentionEveryone,
  setReplyToMessage,
  toggleMention,
} from "../../../utils/message/mentionReply.ts";

// ユーザー情報の取得状態を追跡するグローバルMap
const fetchingUsers = new Map<
  string,
  Promise<{ icon: string; nickName: string }>
>();

const ChatOtherMessage = ({
  name,
  time,
  content,
  isPrimary,
  messageid,
  isFetch,
}: {
  name: string;
  time: string | number | Date;
  content: {
    verified: boolean;
    encrypted: boolean;
    content: string;
    type: string;
    timestamp: string | number | Date;
    original?: string;
  };
  messageid: string;
  isPrimary: boolean;
  isFetch: true | undefined;
}) => {
  const isPrimaryClass = isPrimary
    ? "c-talk-chat other primary"
    : "c-talk-chat other subsequent";
  const [icon, setIcon] = createSignal(DEFAULT_ICON);
  const [nickName, setNickName] = createSignal("");
  const [icons, setIcons] = useAtom(iconsState);
  const [nickNames, setNickNames] = useAtom(nickNamesState);

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

  // ユーザーを報告
  const reportUser = () => {
    alert(`${name} を報告する機能は開発中です`);
  };

  // メニュー項目の定義
  const menuItems = [
    { label: "メッセージをコピー", onClick: copyMessage },
    {
      label: "リプライ",
      onClick: () => {
        setReplyToMessage(messageid, content.type as any, content.content);
        setShowContextMenu(false);
      },
    },
    {
      label: "メンション",
      onClick: () => {
        toggleMention(name);
        setShowContextMenu(false);
      },
    },
    {
      label: "全員をメンション",
      onClick: () => {
        mentionEveryone();
        setShowContextMenu(false);
      },
    },
    { label: "ユーザーを報告", onClick: reportUser },
  ];

  createEffect(async () => {
    if (!isFetch) return;

    // ローカルステートから情報を取得
    const iconData = icons().find((value) => value.key === name);
    const nickNameData = nickNames().find((value) => value.key === name);

    // 既にアイコンとニックネームが取得済みの場合はそれを使用
    if (iconData) {
      setIcon(iconData.icon);
    }
    if (nickNameData) {
      setNickName(nickNameData.nickName);
    }

    // 両方とも取得済みならAPI呼び出しは不要
    if (iconData && nickNameData) {
      return;
    }

    // まだ取得処理中でないユーザーの場合、新しく取得処理を開始
    if (!fetchingUsers.has(name)) {
      const fetchUserInfo = async () => {
        const domain = name.split("@")[1];
        const [iconResponse, nickNameResponse] = await Promise.all([
          fetch(`https://${domain}/_takos/v1/user/icon/${name}`).then((res) =>
            res.json()
          ),
          fetch(`https://${domain}/_takos/v1/user/nickName/${name}`).then((
            res,
          ) => res.json()),
        ]);

        const iconBase64 = "data:image/png;base64," + iconResponse.icon;
        const nickNameValue = nickNameResponse.nickName;

        // グローバルstateに保存
        if (!iconData) {
          setIcons((
            prev,
          ) => [...prev, { key: name, icon: iconBase64, type: "friend" }]);
        }
        if (!nickNameData) {
          setNickNames((
            prev,
          ) => [...prev, {
            key: name,
            nickName: nickNameValue,
            type: "friend",
          }]);
        }

        return { icon: iconBase64, nickName: nickNameValue };
      };

      fetchingUsers.set(name, fetchUserInfo());
    }

    try {
      const result = await fetchingUsers.get(name);
      if (!result) return;
      if (!iconData) setIcon(result.icon);
      if (!nickNameData) setNickName(result.nickName);
    } catch (error) {
      console.error(`Failed to fetch user info for ${name}:`, error);
    }
  });

  return (
    <li class={isPrimaryClass}>
      <div class="c-talk-chat-box mb-1" onContextMenu={handleContextMenu}>
        {isPrimary && (
          <div class="c-talk-chat-icon">
            <img
              src={icon()}
              alt="image"
              class="rounded-full text-white dark:text-black"
            />
          </div>
        )}
        <div class="c-talk-chat-right">
          {isPrimary && (
            <div class="c-talk-chat-name">
              <p>{nickName()}</p>
            </div>
          )}
          {renderMessageContent(content, name)}
        </div>
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
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

export default ChatOtherMessage;
