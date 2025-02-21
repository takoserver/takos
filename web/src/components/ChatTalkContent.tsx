import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { messageListState, messageValueState } from "../utils/state.ts";
import { useAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx";
import ChatOtherMessage from "./OtherMessage.tsx";
import { getMessage } from "../utils/getMessage.ts";
import { createEffect, createSignal, JSX } from "solid-js";
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
  const [selectedMode, setSelectedMode] = createSignal<"category" | "channel">("category");
  const [nameValue, setNameValue] = createSignal("");

  const createEntity = () => {
    console.log(`${selectedMode()}作成:`, nameValue());
    setNameValue("");
    setShowCreateChannelModal(false);
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
                class={`flex-1 p-2 rounded ${selectedMode() === "category" ? "bg-green-500 text-white" : "bg-gray-300 text-black"}`}
              >
                カテゴリー作成
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMode("channel");
                  setNameValue("");
                }}
                class={`flex-1 p-2 ml-2 rounded ${selectedMode() === "channel" ? "bg-blue-500 text-white" : "bg-gray-300 text-black"}`}
              >
                チャンネル作成
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={nameValue()}
                onInput={(e) => setNameValue(e.currentTarget.value)}
                placeholder={selectedMode() === "category" ? "カテゴリー名" : "チャンネル名"}
                class="w-full p-2 border rounded mb-2"
              />
              <button
                type="submit"
                class={`w-full py-2 rounded ${selectedMode() === "category" ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"} text-white`}
              >
                {selectedMode() === "category" ? "カテゴリー作成" : "チャンネル作成"}
              </button>
            </form>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}

function ChannelSideBar() {
  const [isOpenChannel, setIsOpenChannel] = createSignal(false);
  const [isSelectRoom] = useAtom(selectedRoomState);
  const [groupChannel] = useAtom(groupChannelState);

  function createChannel() {
    setShowCreateChannelModal(true);
  }

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
                      const sortedChannels = [...groupInfo.channels].sort(
                        (a, b) => a.order - b.order,
                      );
                      function channelCompornent({
                        name,
                        id,
                      }: {
                        name: string;
                        id: string;
                      }) {
                        return (
                          <li class="hover:bg-gray-700 rounded">
                            <button
                              class="w-full text-left py-2 px-4 text-white hover:bg-gray-600 transition-colors"
                              onClick={() => {
                                // チャンネル選択時の処理を記述
                              }}
                            >
                              {name}
                            </button>
                          </li>
                        );
                      }
                      function channelCategory({
                        name,
                        id,
                        children,
                      }: {
                        name: string;
                        id: string;
                        children: JSX.Element;
                      }) {
                        return (
                          <li class="mt-2">
                            <div class="px-4 py-2">
                              <span class="block text-gray-300 font-semibold">
                                {name}
                              </span>
                              {children}
                            </div>
                          </li>
                        );
                      }
                      return sortedChannels.map((channel) => {
                        if (channel.category) return null;
                        const childrenChannels = sortedChannels.filter(
                          (ch) => ch.category === channel.id,
                        );
                        if (childrenChannels.length > 0) {
                          const childrenElements = childrenChannels.map(
                            (child) =>
                              channelCompornent({
                                name: child.name,
                                id: child.id,
                              }),
                          );
                          return channelCategory({
                            name: channel.name,
                            id: channel.id,
                            children: (
                              <ul class="pl-4 mt-2">
                                {childrenElements}
                              </ul>
                            ),
                          });
                        } else {
                          return channelCompornent({
                            name: channel.name,
                            id: channel.id,
                          });
                        }
                      });
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
