import {
  isSelectRoomState,
  selectedChannelState,
  selectedRoomState,
} from "../utils/roomState";
import { messageListState, messageValueState } from "../utils/state.ts";
import { atom, useAtom } from "solid-jotai";
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
  timestamp: number;  // string | number から number に変更
  messageid: string;
  roomid: string;
  serverData: {
    userName: string;
    timestamp: number;  // string | number から number に変更
  };
}>();
// MessagesStateの定義は変更なし
const messagesState = atom<{
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
}[]>(
  [],
);

export const isLoadedMessageState = atom(false);
const [processedMessageIds, setProcessedMessageIds] = createSignal<
  Set<string>
>(new Set());

const [messageTimeLine, setMessageTimeLine] = createSignal<{
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: number;  // number | string から number に変更
  messageid: string;
  roomid: string;
  serverData: {
    userName: string;
    timestamp: number;  // string | number から number に変更
  };
}[]>([]);

function ChatTalkMain() {
  const [messageList] = useAtom(messageListState);
  const [loaded, setLoaded] = useAtom(isLoadedMessageState);
  const [sellectedRoom] = useAtom(selectedRoomState);
  const [messages, setMessages] = useAtom(messagesState);

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
        <CreateChannelModal />
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
                      type: message.type,
                      timestamp: message.timestamp,
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

import { onMount } from "solid-js";
import { PopUpFrame } from "./popUpFrame.tsx";
import { uuidv7 } from "uuidv7";

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

const [showCreateChannelModal, setShowCreateChannelModal] = createSignal(false);

function CreateChannelModal() {
  const [selectedMode, setSelectedMode] = createSignal<"category" | "channel">(
    "category",
  );
  const [nameValue, setNameValue] = createSignal("");
  const [sellectedRoom] = useAtom(selectedRoomState);
  const createEntity = async () => {
    if (selectedMode() === "category") {
      const match = sellectedRoom()?.roomid.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return console.error("Invalid roomid");
      }
      const res = await fetch("/api/v2/group/category/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          groupId: match[1] + "@" + match[2],
          name: nameValue(),
          id: uuidv7(),
          permissions: [],
        }),
      });
      if (!res.ok) {
        console.error("Failed to create channel");
        return alert("チャンネルの作成に失敗しました");
      }
      alert("チャンネルを作成しました");
      setNameValue("");
      setShowCreateChannelModal(false);
    }
    if (selectedMode() === "channel") {
      const match = sellectedRoom()?.roomid.match(/^g\{([^}]+)\}@(.+)$/);
      if (!match) {
        return console.error("Invalid roomid");
      }
      const res = await fetch("/api/v2/group/channel/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          groupId: match[1] + "@" + match[2],
          name: nameValue(),
          id: uuidv7(),
          categoryId: "",
          permissions: [],
        }),
      });
      if (!res.ok) {
        console.error("Failed to create channel");
        return alert("チャンネルの作成に失敗しました");
      }
      alert("チャンネルを作成しました");
      setNameValue("");
      setShowCreateChannelModal(false);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    createEntity();
  };

  return (
    <>
      {showCreateChannelModal() && (
        <PopUpFrame closeScript={setShowCreateChannelModal}>
          <div class="p-4">
            <h2 class="text-xl font-bold mb-4">チャンネルの作成</h2>
            <div class="flex mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode("category");
                  setNameValue("");
                }}
                class={`flex-1 p-2 rounded ${
                  selectedMode() === "category"
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                カテゴリー作成
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMode("channel");
                  setNameValue("");
                }}
                class={`flex-1 p-2 ml-2 rounded ${
                  selectedMode() === "channel"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                チャンネル作成
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={nameValue()}
                onInput={(e) =>
                  setNameValue(e.currentTarget.value)}
                placeholder={selectedMode() === "category"
                  ? "カテゴリー名"
                  : "チャンネル名"}
                class="w-full p-2 border rounded mb-2 text-black"
              />
              <button
                type="submit"
                class={`w-full py-2 rounded ${
                  selectedMode() === "category"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white`}
              >
                {selectedMode() === "category"
                  ? "カテゴリー作成"
                  : "チャンネル作成"}
              </button>
            </form>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}

export const showEditChannelModalState = atom(false);
export const contextMenuPositionState = atom<
  { x: number; y: number; type: "channel" | "category" | null; id: string }
>({ x: 0, y: 0, type: null, id: "" });
function ChannelSideBar() {
  const [contextMenuPosition, setContextMenuPosition] = useAtom(contextMenuPositionState);
  const [selectedChannel, setSelectedChannel] = useAtom(selectedChannelState);
  const [isOpenChannel, setIsOpenChannel] = createSignal(false);
  const [isSelectRoom] = useAtom(selectedRoomState);
  const [groupChannel] = useAtom(groupChannelState);
  const [showContextMenu, setShowContextMenu] = createSignal(false);
  const [contextMenuTarget, setContextMenuTarget] = createSignal<
    { id: string; type: "channel" | "category" | null }
  >({ id: "", type: null });
  const [sellectedRoom] = useAtom(selectedRoomState);
  const [messageList, setMessageList] = useAtom(messageListState);
  const [showEditChannelModal, setShowEditChannelModal] = useAtom(showEditChannelModalState);
  // クリックでコンテキストメニューを閉じる
  onMount(() => {
    const clickHandler = (e: MouseEvent) => {
      setShowContextMenu(false);
    };
    document.addEventListener("click", clickHandler);
    onCleanup(() => {
      document.removeEventListener("click", clickHandler);
    });
  });

  function createChannel() {
    setShowCreateChannelModal(true);
  }

  const handleContextMenu = (e: MouseEvent, id: string, type: string) => {
    e.preventDefault();
    e.stopPropagation(); // 親要素へのイベント伝播を防止
    setContextMenuTarget({
      id,
      type: type as "channel" | "category",
    });
    setShowContextMenu(true);
  };

  const handleMenuItemClick = (item: string) => {
    console.log(item + " clicked");
    setShowContextMenu(false);
  };
  const [messages, setMessages] = useAtom(messagesState);
  return (
    <>
      {isSelectRoom()?.type === "group" && (
        <>
          {isOpenChannel() === true && (
            <>
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  transform: "translateY(-50%)",
                  "backdrop-filter": "blur(10px)",
                  "background-color": "rgba(24, 24, 24, 0.5)",
                }}
                class="z-[99] border-t border-r border-b border-solid border-gray-300 rounded-r-lg h-4/5 max-w-[400px] w-full"
              >
                <div class="flex items-center justify-between border-b border-gray-700 px-5 py-3">
                  <h2 class="text-xl font-semibold text-white">チャンネル</h2>
                  <button
                    onClick={() => setIsOpenChannel(!isOpenChannel())}
                    aria-label="閉じる"
                    class="text-gray-400 hover:text-white text-2xl transition-colors"
                  >
                    &times;
                  </button>
                </div>
                <div>
                  <ul class="p-talk-list-rooms__ul">
                    {(() => {
                      const groupInfo = groupChannel();
                      if (!groupInfo) return <></>;
                      function ChannelCompornent({
                        name,
                        id,
                      }: {
                        name: string;
                        id: string;
                      }) {
                        return (
                          <li class="hover:bg-gray-700 rounded relative">
                            <button
                              class={`w-full text-left py-2 px-4 text-white transition-colors ${
                                selectedChannel() === id
                                  ? "bg-blue-500"
                                  : "hover:bg-gray-600"
                              }`}
                              onClick={async () => {
                                setSelectedChannel(id);
                                const match = sellectedRoom()?.roomid.match(
                                  /^g\{([^}]+)\}@(.+)$/,
                                );
                                if (!match) {
                                  return console.error("Invalid roomid");
                                }

                                try {
                                  const messages = await fetch(
                                    "/api/v2/message/group/" +
                                      sellectedRoom()?.roomid + "/" + id,
                                  );

                                  if (!messages.ok) {
                                    console.error("Failed to fetch messages");
                                    return;
                                  }

                                  const messagesJson =
                                    (((await messages.json()).messages) as {
                                      userName: string;
                                      messageid: string;
                                      timestamp: string;
                                    }[]).sort((a, b) =>
                                      new Date(a.timestamp).getTime() -
                                      new Date(b.timestamp).getTime()
                                    );

                                  // 新しいチャンネルを選択したとき、メッセージリストとキャッシュをリセット
                                  setProcessedMessageIds(() =>
                                    new Set<string>()
                                  );
                                  setMessages([]);
                                  setMessageTimeLine([]);

                                  // 遅延してセットすることで状態が正しく更新されるようにする
                                  setTimeout(() => {
                                    setMessageList(messagesJson);
                                  }, 10);
                                } catch (error) {
                                  console.error(
                                    "Error fetching messages:",
                                    error,
                                  );
                                }
                              }}
                              onContextMenu={(e) =>
                                handleContextMenu(e, id, "channel")}
                            >
                              {name}
                            </button>

                            {/* チャンネルのコンテキストメニュー */}
                            {showContextMenu() &&
                              contextMenuTarget().id === id &&
                              contextMenuTarget().type === "channel" && (
                              <div class="absolute right-1 top-1 bg-gray-800 text-white rounded-lg shadow-lg p-2 animate-fadeIn z-50">
                                <ul>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
                                    onClick={() => {
                                      handleMenuItemClick("編集");
                                      setContextMenuPosition({
                                        x: 0,
                                        y: 0,
                                        type: "channel",
                                        id: id,
                                      });
                                      setShowEditChannelModal(true);
                                    }}
                                  >
                                    編集
                                  </li>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
                                    onClick={async () => {
                                      const match = sellectedRoom()?.roomid
                                        .match(
                                          /^g\{([^}]+)\}@(.+)$/,
                                        );
                                      if (!match) {
                                        return console.error("Invalid roomid");
                                      }

                                      const res = await fetch(
                                        "/api/v2/group/channel/delete",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            groupId: match[1] + "@" + match[2],
                                            channelId: id,
                                          }),
                                        },
                                      );
                                      if (!res.ok) {
                                        console.error(
                                          "Failed to delete channel",
                                        );
                                      }
                                      alert("チャンネルを削除しました");
                                      setShowContextMenu(false);
                                    }}
                                  >
                                    削除
                                  </li>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
                                    onClick={async () => {
                                      const match = sellectedRoom()?.roomid
                                        .match(
                                          /^g\{([^}]+)\}@(.+)$/,
                                        );
                                      if (!match) {
                                        return console.error("Invalid roomid");
                                      }

                                      const res = await fetch(
                                        "/api/v2/group/channel/default",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            groupId: match[1] + "@" + match[2],
                                            channelId: id,
                                          }),
                                        },
                                      );
                                      if (!res.ok) {
                                        return console.error(
                                          "Failed to set default channel",
                                        );
                                      }
                                      alert(
                                        "チャンネルをデフォルトに設定しました",
                                      );
                                      setShowContextMenu(false);
                                    }}
                                  >
                                    デフォルトに設定
                                  </li>
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      }
                      function ChannelCategory({
                        name,
                        children,
                        id,
                      }: {
                        name: string;
                        id: string;
                        children: JSX.Element;
                      }) {
                        return (
                          <li class="mt-2 hover:bg-gray-700 relative">
                            <div
                              class="px-4 py-2"
                              onContextMenu={(e) =>
                                handleContextMenu(e, id, "category")}
                            >
                              <span class="block text-gray-300 font-semibold">
                                {name}
                              </span>
                              {children}
                            </div>

                            {/* カテゴリーのコンテキストメニュー */}
                            {showContextMenu() &&
                              contextMenuTarget().id === id &&
                              contextMenuTarget().type === "category" && (
                              <div class="absolute right-1 top-1 bg-gray-800 text-white rounded-lg shadow-lg p-2 animate-fadeIn z-50">
                                <ul>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
                                    onClick={() => {
                                      handleMenuItemClick("編集");
                                      setContextMenuPosition({
                                        x: 0,
                                        y: 0,
                                        type: "category",
                                        id: id,
                                      });
                                      setShowEditChannelModal(true);
                                    }}
                                  >
                                    編集
                                  </li>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
                                    onClick={async () => {
                                      const match = sellectedRoom()?.roomid
                                        .match(
                                          /^g\{([^}]+)\}@(.+)$/,
                                        );
                                      if (!match) {
                                        return console.error("Invalid roomid");
                                      }

                                      const res = await fetch(
                                        "/api/v2/group/category/delete",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            groupId: match[1] + "@" + match[2],
                                            categoryId: id,
                                          }),
                                        },
                                      );
                                      if (!res.ok) {
                                        console.error(
                                          "Failed to delete category",
                                        );
                                      }
                                      alert("カテゴリーを削除しました");
                                      setShowContextMenu(false);
                                    }}
                                  >
                                    削除
                                  </li>
                                  <li
                                    class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200 text-gray-400"
                                    onClick={() => {
                                      alert(
                                        "カテゴリーはデフォルトにできません",
                                      );
                                      setShowContextMenu(false);
                                    }}
                                  >
                                    デフォルトに設定
                                  </li>
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      }
                      return (
                        <>
                          {groupInfo.categories
                            .map((category) => {
                              const categoryChannels = groupInfo.channels
                                .filter((channel) =>
                                  channel.category === category.id
                                );

                              return (
                                <ChannelCategory
                                  name={category.name}
                                  id={category.id}
                                  children={
                                    <ul>
                                      {categoryChannels.map((channel) => (
                                        <ChannelCompornent
                                          name={channel.name}
                                          id={channel.id}
                                        />
                                      ))}
                                    </ul>
                                  }
                                />
                              );
                            })}
                          {groupInfo.channels
                            .filter((channel) => !channel.category)
                            .map((channel) => (
                              <ChannelCompornent
                                name={channel.name}
                                id={channel.id}
                              />
                            ))}
                        </>
                      );
                    })()}
                  </ul>
                  {/* チャンネル作成ボタンを追加 */}
                  <div class="px-4 py-2">
                    <button
                      class="w-full text-left py-2 px-4 mt-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors shadow-sm"
                      onClick={createChannel}
                    >
                      + チャンネル作成
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {isOpenChannel() === false && (
            <button
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                transform: "translateY(-50%)",
              }}
              class="z-[9999] bg-[#12121288] px-1 py-4 border-t border-r border-b border-solid border-gray-300 rounded-r-lg"
              onClick={() => setIsOpenChannel(!isOpenChannel())}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon points="0,0 12,6 0,12" fill="currentColor" />
              </svg>
            </button>
          )}
          
        </>
      )}
    </>
  );
}
export default ChatTalk;

export function ChannelEditModal(props: {
  channel: string;
  onClose: Setter<boolean>;
  type: "channel" | "category";
}) {
  const [groupChannel] = useAtom(groupChannelState);
  const channelInfo = props.type === "channel"
    ? groupChannel()?.channels?.find((channel) => channel.id === props.channel)
    : groupChannel()?.categories?.find((category) =>
      category.id === props.channel
    );
  const [selectedRoom] = useAtom(selectedRoomState);
  const [channelName, setChannelName] = createSignal(channelInfo?.name || "");
  const [channelCategory, setChannelCategory] = createSignal(
    //@ts-ignore
    props ? channelInfo?.category || "" : "",
  );
  // permissions の permission を string[] に変更
  const initialPermissions = channelInfo?.permissions
    ? [...channelInfo.permissions]
    : [];
  const [permissions, setPermissions] = createSignal<
    { roleId: string; permissions: string[] }[]
  >(initialPermissions);
  const handlePermissionChange = (
    index: number,
    field: "roleId" | "permissions",
    value: string | string[],
  ) => {
    setPermissions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const roomId = selectedRoom()?.roomid;
    const much = roomId?.match(/^g\{([^}]+)\}@(.+)$/);
    if (!much) return console.error("Invalid roomid");
    const groupId = much[1] + "@" + much[2];
    if (props.type === "channel") {
      const res = await fetch("/api/v2/group/channel/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: groupId,
          name: channelName(),
          id: props.channel,
          categoryId: channelCategory(),
          permissions: permissions(),
        }),
      });
      if (!res.ok) {
        console.error("Failed to edit channel");
        return;
      }
      alert("チャンネルを編集しました");
    } else {
      const res = await fetch("/api/v2/group/category/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: groupId,
          name: channelName(),
          id: props.channel,
          permissions: permissions().map((perm) => ({
            roleId: perm.roleId,
            permissions: perm.permissions,
          })),
        }),
      });
      if (!res.ok) {
        console.error("Failed to edit category");
        return;
      }
      alert("カテゴリーを編集しました");
    }
  };
  const [collapsedStates, setCollapsedStates] = createSignal<boolean[]>(
    permissions().map(() => true),
  );

  const toggleCollapsed = (index: number) => {
    const newStates = [...collapsedStates()];
    newStates[index] = !newStates[index];
    setCollapsedStates(newStates);
  };

  const addPermission = () => {
    setPermissions((prev) => {
      const updated = [...prev, { roleId: "", permissions: [] }];
      // 新たな項目は折りたたみ状態で追加
      setCollapsedStates(updated.map(() => true));
      return updated;
    });
  };
  const removeRole = (index: number) => {
    setPermissions((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setCollapsedStates((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };
  return (
    <PopUpFrame closeScript={props.onClose}>
      <form onSubmit={handleSubmit} class="p-4">
        <h2 class="text-xl font-bold mb-4">チャンネル編集</h2>
        <div class="mb-4">
          <label class="block mb-1">チャンネル名</label>
          <input
            type="text"
            value={channelName()}
            onChange={(e) => setChannelName(e.currentTarget.value)}
            class="w-full p-2 border rounded text-black"
          />
        </div>
        {props.type === "channel" && (
          <div class="mb-4">
            <label class="block mb-1">カテゴリー</label>
            <input
              type="text"
              value={channelCategory()}
              onChange={(e) => setChannelCategory(e.currentTarget.value)}
              class="w-full p-2 border rounded text-black"
            />
          </div>
        )}
        <div class="mb-4">
          <label class="block mb-1">権限設定 (roleId と permission)</label>
          {permissions().map((perm, index) => (
            <div class="border border-gray-300 rounded mb-2">
              <div
                class="flex justify-between items-center bg-gray-200 p-2 cursor-pointer text-black"
                onClick={() => toggleCollapsed(index)}
              >
                <span>{perm.roleId || "新しい権限"}</span>
                <span>{collapsedStates()[index] ? "▼" : "▲"}</span>
              </div>
              {!collapsedStates()[index] && (
                <div class="p-2">
                  <div class="flex justify-between items-center mb-2">
                    <input
                      type="text"
                      value={perm.roleId}
                      placeholder="roleId"
                      onChange={(e) =>
                        handlePermissionChange(
                          index,
                          "roleId",
                          e.currentTarget.value,
                        )}
                      class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRole(index);
                      }}
                      class="ml-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded transition-colors duration-200"
                    >
                      削除
                    </button>
                  </div>
                  <div class="mb-2">
                    {[
                      "SEND_MESSAGE",
                      "VIEW_MESSAGE",
                      "MENTION_USER",
                      "MANAGE_MESSAGE",
                    ].map((permission) => (
                      <label class="inline-flex items-center mr-2">
                        <input
                          type="checkbox"
                          checked={perm.permissions.includes(permission)}
                          onChange={(e) => {
                            const newPermissions = [...perm.permissions];
                            if (e.currentTarget.checked) {
                              if (!newPermissions.includes(permission)) {
                                newPermissions.push(permission);
                              }
                            } else {
                              const idx = newPermissions.indexOf(permission);
                              if (idx > -1) {
                                newPermissions.splice(idx, 1);
                              }
                            }
                            handlePermissionChange(
                              index,
                              "permissions",
                              newPermissions,
                            );
                          }}
                          class="mr-1"
                        />
                        {permission}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPermission}
            class="mt-2 px-4 py-2 bg-gray-300 rounded"
          >
            + 追加
          </button>
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            onClick={() => props.onClose(false)}
            class="mr-2 px-4 py-2 border rounded"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded"
          >
            保存
          </button>
        </div>
      </form>
    </PopUpFrame>
  );
}
