import {
  isSelectRoomState,
  selectedChannelState,
  selectedRoomState,
} from "../utils/roomState";
import { messageListState, messageValueState } from "../utils/state.ts";
import { atom, useAtom, useSetAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx";
import ChatOtherMessage from "./OtherMessage.tsx";
import { getMessage } from "../utils/getMessage.ts";
import { createEffect, createSignal, JSX, onCleanup, Setter } from "solid-js";
import { groupChannelState } from "./Chat/SideBar.tsx";

const myuserName = localStorage.getItem("userName") + "@" +
  (document.location.hostname);

const messageCache = new Map<string, {
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: number; // string | number から number に変更
  messageid: string;
  roomid: string;
  original?: string;
  serverData: {
    userName: string;
    timestamp: number; // string | number から number に変更
  };
}>();
// MessagesStateの定義は変更なし
export const messagesState = atom<{
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: number;
  messageid: string;
  roomid: string;
  original?: string;
  serverData: {
    userName: string;
    timestamp: number;
  };
}[]>(
  [],
);

export const isLoadedMessageState = atom(false);
export const processedMessageIdsState = atom<Set<string>>(new Set<string>());

export const messageTimeLineState = atom<{
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: number; 
  messageid: string;
  roomid: string;
  original?: string;
  serverData: {
    userName: string;
    timestamp: number;
  };
}[]>([]);

function ChatTalkMain() {
  const [processedMessageIds, setProcessedMessageIds] = useAtom(
    processedMessageIdsState
  );
  const [messageList] = useAtom(messageListState);
  const [loaded, setLoaded] = useAtom(isLoadedMessageState);
  const [sellectedRoom] = useAtom(selectedRoomState);
  const [messages, setMessages] = useAtom(messagesState);

  const [messageTimeLine, setMessageTimeLine] = useAtom(messageTimeLineState);
  createEffect(async () => {
    const result:
      | any[]
      | ((prev: {
        verified: boolean;
        encrypted: boolean;
        content: string;
        type: string;
        timestamp: number | string;
        messageid: string;
        roomid: string;
        serverData: {
          userName: string;
          timestamp: string;
        };
      }[]) => any[]) = [];
    const currentMessageList = messageList();
    if (currentMessageList.length === 0) {
      setMessageTimeLine([]);
      setLoaded(true);
      return;
    }
    const roomid = sellectedRoom()?.roomid;
    const type = sellectedRoom()?.type;
    if (!roomid || !type) {
      return;
    }
    // ルームが変わったら処理済みIDリストをリセット（キャッシュはそのまま維持）
    if (messages().length > 0 && messages()[0].roomid !== roomid) {
      setMessages([]);
      setProcessedMessageIds(() => new Set<string>());
    }
    // まだ処理していないメッセージだけをフィルタリング
    const newMessages = currentMessageList.filter(
      (msg) => !processedMessageIds().has(`${msg.messageid}-${roomid}`),
    );

    // validMessages変数を先に宣言しておく
    let validMessages: {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: string;
      timestamp: number;
      messageid: string;
      roomid: string;
      serverData: {
        userName: string;
        timestamp: number;
      };
    }[] = [];

    if (newMessages.length === 0) {
      setLoaded(true);
      // 既存のメッセージから情報を取得してリザルトに追加
      messageList().map((messageIds) => {
        const message = messages().find(
          (msg) => msg.messageid === messageIds.messageid,
        );
        if (message) {
          result.push(message);
        }
      });
      setMessageTimeLine(result as any);
      return;
    }
    const processedIds = new Set(processedMessageIds());
    const messagesResult = await Promise.all(
      newMessages.map(async (message) => {
        // 処理済みとしてマーク
        processedIds.add(`${message.messageid}-${roomid}`);

        // キャッシュキーを作成
        const cacheKey = `${message.messageid}-${roomid}`;

        // キャッシュをチェック
        if (messageCache.has(cacheKey)) {
          return messageCache.get(cacheKey)!;
        }

        try {
          const serverData = await getMessage({
            messageid: message.messageid,
            roomId: roomid,
            type,
            senderId: message.userName,
          });

          const messageData = {
            verified: serverData.verified,
            encrypted: serverData.encrypted,
            content: serverData.value.content,
            type: String(serverData.value.type),
            timestamp: Number(serverData.timestamp),
            messageid: message.messageid,
            roomid: roomid,
            original: serverData.original,
            serverData: {
              userName: message.userName,
              timestamp: Number(serverData.timestamp), // 確実に number に変換
            },
          };

          // キャッシュに保存（reactive signalでなくグローバルオブジェクトを直接更新）
          messageCache.set(cacheKey, messageData);

          return messageData;
        } catch (error) {
          const errorMessage = {
            verified: false,
            encrypted: false,
            content: "メッセージの取得に失敗しました",
            type: "error",
            timestamp: new Date().getTime(),
            messageid: message.messageid,
            roomid: roomid,
            serverData: {
              userName: message.userName,
              timestamp: new Date().getTime(), // toISOStringからgetTimeに変更
            },
          };

          // エラーメッセージもキャッシュ
          messageCache.set(cacheKey, errorMessage);

          return errorMessage;
        }
      }),
    );
    setProcessedMessageIds(processedIds);
    validMessages = messagesResult.filter((
      item,
    ): item is NonNullable<typeof item> => item !== undefined);
    if (validMessages.length > 0) {
      // 新しいメッセージを既存のメッセージに追加
      setMessages((prev) => [...prev, ...validMessages]);

      // ここで全メッセージを取得してタイムラインを構築
      const allMessages = [...messages(), ...validMessages];
      const uniqueMessages = new Map();
      // 重複を排除して最新のメッセージを保持
      allMessages.forEach((msg) => uniqueMessages.set(msg.messageid, msg));

      // メッセージIDリストの順序に従ってメッセージを並べる
      messageList().forEach((messageIds) => {
        const message = uniqueMessages.get(messageIds.messageid);
        if (message) {
          result.push(message);
        }
      });

      setMessageTimeLine(result);
      setLoaded(true);
    }
  });

  let chatListRef: HTMLDivElement | undefined;
  createEffect(() => {
    const messages = messageList();
    if (messages.length && chatListRef) {
      setTimeout(() => {
        chatListRef?.scrollTo({
          top: chatListRef.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  });
  return (
    <>
      <div class="pl-2" id="chatList" ref={chatListRef}>
        {loaded() && (
          <>
            {messageTimeLine().map((message) => {
              if (message.serverData.userName === myuserName) {
                return (
                  <ChatSendMessage
                    time={message.serverData.timestamp}
                    content={{
                      verified: message.verified,
                      encrypted: message.encrypted,
                      content: message.content,
                      type: message.type as
                        | "text"
                        | "image"
                        | "video"
                        | "audio"
                        | "file",
                      timestamp: message.timestamp,
                      original: message.original,
                    }}
                    messageid={message.messageid}
                    isPrimary={true}
                    isSendPrimary={true}
                  />
                );
              } else {
                return (
                  <ChatOtherMessage
                    name={message.serverData.userName}
                    time={message.serverData.timestamp}
                    content={{
                      verified: message.verified,
                      encrypted: message.encrypted,
                      content: message.content,
                      type: message.type,
                      timestamp: message.timestamp,
                      original: message.original,
                    }}
                    messageid={message.messageid}
                    isPrimary={true}
                    isFetch={true}
                  />
                );
              }
            })}
          </>
        )}
        {!loaded() && (
          <div class="flex w-full h-full">
            <p class="m-auto">読み込み中...</p>
          </div>
        )}
      </div>
    </>
  );
}

import { ChannelSideBar } from "./ChannelSideBar.tsx";

function ChatTalk() {
  const [isChoiceUser] = useAtom(isSelectRoomState);
  return (
    <>
      {isChoiceUser() === true
        ? (
          <>
            <ul class="c-talk-chat-list">
              <ChannelSideBar />
              <ChatTalkMain />
            </ul>
          </>
        )
        : (
          <>
            <div class="flex w-full h-full">
              <p class="m-auto">友達を選択してください</p>
            </div>
          </>
        )}
    </>
  );
}

export const showCreateChannelModalState = atom(false);

export const showEditChannelModalState = atom(false);
export const contextMenuPositionState = atom<
  { x: number; y: number; type: "channel" | "category" | null; id: string }
>({ x: 0, y: 0, type: null, id: "" });


export default ChatTalk;

