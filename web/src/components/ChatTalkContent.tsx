import {
  isSelectRoomState,
  selectedChannelState,
  selectedRoomState,
} from "../utils/roomState";
import { messageListState, messageValueState } from "../utils/state.ts";
import { useAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx";
import ChatOtherMessage from "./OtherMessage.tsx";
import { getMessage } from "../utils/getMessage.ts";
import { createEffect, createSignal, JSX, onCleanup, Setter } from "solid-js";
import { groupChannelState } from "./Chat/SideBar.tsx";

const myuserName = localStorage.getItem("userName") + "@" +
  (document.location.hostname);

function ChatTalkMain() {
  const [messageList] = useAtom(messageListState);
  const list = messageList();
  return (
    <>
      <div class="pl-2" id="chatList">
        <CreateChannelModal />
        {list.map((message) => {
          return (
            <>
              <Message
                messageid={message.messageid}
                myMessage={message.userName === myuserName}
                time={message.timestamp}
                userName={message.userName}
              />
            </>
          );
        })}
      </div>
    </>
  );
}

import { onMount } from "solid-js";
import { PopUpFrame } from "./popUpFrame.tsx";
import { uuidv7 } from "uuidv7";

function Message(
  { messageid, myMessage, time, userName }: {
    messageid: string;
    myMessage: boolean;
    time: string;
    userName: string;
  },
) {
  const [messageValue, setMessageValue] = useAtom(messageValueState);
  const [loaded, setLoaded] = createSignal(false);
  const [sellectedRoom] = useAtom(selectedRoomState);
  onMount(async () => {
    const foundMessage = messageValue().find((val) => val[0] === messageid);
    if (!foundMessage) {
      try {
        const type = sellectedRoom()?.type;
        const roomId = sellectedRoom()?.roomid;
        if (!type || !roomId) return;
        const message = await getMessage({
          messageid,
          type,
          roomId,
          senderId: userName,
        });
        setMessageValue((prev) => [...prev, [messageid, message]]);
      } catch (e) {
        console.log(e);
        setMessageValue((prev) => [
          ...prev,
          [
            messageid,
            {
              verified: false,
              encrypted: true,
              content: "メッセージの取得に失敗しました",
              type: "error",
              timestamp: new Date().toISOString(),
            },
          ],
        ]);
      }
    }
    setLoaded(true);
  });

  return (
    <>
      {loaded() && (
        <>
          {myMessage && (
            <ChatSendMessage
              time={time}
              message={messageValue}
              messageid={messageid}
              isPrimary={true}
              isSendPrimary={true}
            />
          )}
          {!myMessage && (
            <ChatOtherMessage
              name={userName}
              time={time}
              messageid={messageid}
              message={messageValue}
              isPrimary={true}
              isFetch={true}
            />
          )}
        </>
      )}
    </>
  );
}

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
      const res = await fetch("/api/v2/group/category/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          groupId: match[1] + "@" + match[2],
          name: nameValue(),
          id: uuidv7(),
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
      const res = await fetch("/api/v2/group/channel/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          groupId: match[1] + "@" + match[2],
          name: nameValue(),
          id: uuidv7(),
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
const [showEditChannelModal, setShowEditChannelModal] = createSignal(false);
const [contextMenuPosition, setContextMenuPosition] = createSignal<
  { x: number; y: number; type: "channel" | "category" | null; id: string }
>({ x: 0, y: 0, type: null, id: "" });
function ChannelSideBar() {
  const [selectedChannel, setSelectedChannel] = useAtom(selectedChannelState);
  const [isOpenChannel, setIsOpenChannel] = createSignal(false);
  const [isSelectRoom] = useAtom(selectedRoomState);
  const [groupChannel] = useAtom(groupChannelState);
  const [showContextMenu, setShowContextMenu] = createSignal(false);
  const [sellectedRoom] = useAtom(selectedRoomState);
  const [messageList, setMessageList] = useAtom(messageListState);
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
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY,
      type: type as "channel" | "category",
      id,
    });
    setShowContextMenu(true);
  };
  const handleMenuItemClick = (item: string) => {
    console.log(item + " clicked");
    setShowContextMenu(false);
  };
  return (
    <>
      {showContextMenu() && (
        <div
          style={{
            position: "fixed",
            top: contextMenuPosition().y + "px",
            left: contextMenuPosition().x + "px",
            "z-index": 99999,
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <ul class="bg-gray-800 text-white rounded-lg shadow-lg p-2 animate-fadeIn">
            <li
              class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
              onClick={() => {
                handleMenuItemClick("編集");
                setShowEditChannelModal(true);
              }}
            >
              編集
            </li>
            <li
              class="cursor-pointer p-2 hover:bg-gray-700 rounded transition-colors duration-200"
              onClick={async () => {
                const match = sellectedRoom()?.roomid.match(
                  /^g\{([^}]+)\}@(.+)$/,
                );
                if (!match) {
                  return console.error("Invalid roomid");
                }
                const res = await fetch("/api/v2/group/channel/delete", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },

                  body: JSON.stringify({
                    groupId: match[1] + "@" + match[2],
                    channelId: contextMenuPosition().id,
                  }),
                });
                if (!res.ok) {
                  console.error("Failed to create channel");
                }
                alert("チャンネルを削除しました");
              }}
            >
              削除
            </li>
          </ul>
        </div>
      )}
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
                          <li
                            class="hover:bg-gray-700 rounded"
                            onContextMenu={(e) =>
                              handleContextMenu(e, id, "channel")}
                          >
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
                                const messages = await fetch(
                                  "/api/v2/message/group/" +
                                    sellectedRoom()?.roomid + "/" + id,
                                );
                                const messagesJson =
                                  (((await messages.json()).messages) as {
                                    userName: string;
                                    messageid: string;
                                    timestamp: string;
                                  }[]).sort((a, b) =>
                                    new Date(a.timestamp).getTime() -
                                    new Date(b.timestamp).getTime()
                                  );
                                console.log(messagesJson);
                                setMessageList([]);
                                setTimeout(() => {
                                  setMessageList(messagesJson);
                                }, 10);
                              }}
                            >
                              {name}
                            </button>
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
                          <li
                            class="mt-2 hover:bg-gray-700"
                            onContextMenu={(e) =>
                              handleContextMenu(e, id, "category")}
                          >
                            <div class="px-4 py-2">
                              <span class="block text-gray-300 font-semibold">
                                {name}
                              </span>
                              {children}
                            </div>
                          </li>
                        );
                      }
                      return (
                        <>
                          {groupInfo.categories
                            .sort((a, b) => a.order - b.order)
                            .map((category) => {
                              const categoryChannels = groupInfo.channels
                                .filter((channel) => channel.category === category.id)
                                .sort((a, b) => a.order - b.order);
                      
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
                          .sort((a, b) => a.order - b.order)
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
          {showEditChannelModal() && (
            <ChannelEditModal
              channel={contextMenuPosition().id}
              type={contextMenuPosition().type!}
              onClose={setShowEditChannelModal}
            />
          )}
        </>
      )}
    </>
  );
}
export default ChatTalk;

function ChannelEditModal(props: {
  channel: string;
  onClose: Setter<boolean>;
  type: "channel" | "category";
}) {
  const [groupChannel] = useAtom(groupChannelState);
  const channelInfo =
  props.type === "channel"
    ? groupChannel()?.channels?.find((channel) => channel.id === props.channel)
    : groupChannel()?.categories?.find((category) => category.id === props.channel);
  const [selectedRoom] = useAtom(selectedRoomState);
  const [channelName, setChannelName] = createSignal(channelInfo?.name || "");
  const [channelCategory, setChannelCategory] = createSignal(
    //@ts-ignore
    props ? channelInfo?.category || "" : ""
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
    if(props.type === "channel") {
    const res = await fetch("/api/v2/group/channel/edit", {
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
      const res = await fetch("/api/v2/group/category/edit", {
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
