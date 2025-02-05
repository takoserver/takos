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
  onMount(async () => {
    const foundMessage = messageValue().find((val) => val[0] === messageid);
    if (!foundMessage) {
      try {
        const message = await getMessage(messageid, userName);
        setMessageValue((prev) => [...prev, [messageid, message]]);
      } catch (e) {
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

function ChannelSideBar() {
  const [isOpenChannel, setIsOpenChannel] = createSignal(false);
  const [isSelectRoom] = useAtom(selectedRoomState);
  const [groupChannel] = useAtom(groupChannelState);
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
                  "backdrop-filter": "blur(10px)", // ここでぼかしを指定
                  "background-color": "rgba(24, 24, 24, 0.5)", // 半透明にする
                }}
                class="z-[9999] border-t border-r border-b border-solid border-gray-300 rounded-r-lg h-4/5 max-w-[400px] w-full"
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

                      // order順にソート
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
                        // 子チャンネルの場合は親内に含めるためスキップ
                        if (channel.category) return null;

                        // 現在のチャンネルの子供を抽出
                        const childrenChannels = sortedChannels.filter(
                          (ch) => ch.category === channel.id,
                        );

                        if (childrenChannels.length > 0) {
                          // 子チャンネルが存在するなら category として表示
                          const childrenElements = childrenChannels.map(
                            (child) =>
                              channelCompornent({
                                name: child.name,
                                id: child.id,
                              })
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
                          // 単独表示
                          return channelCompornent({
                            name: channel.name,
                            id: channel.id,
                          });
                        }
                      });
                    })()}
                  </ul>
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
