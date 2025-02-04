import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { 
  messageListState,
  messageValueState,
} from "../utils/state.ts"
import { useAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx"
import ChatOtherMessage from "./OtherMessage.tsx";
import { getMessage } from "../utils/getMessage.ts";
import { createEffect, createSignal } from "solid-js";

const myuserName = localStorage.getItem("userName") + "@" + (document.location.hostname)

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

function Message({ messageid, myMessage, time, userName }: { messageid: string, myMessage: boolean, time: string, userName: string }) {
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

export default ChatTalk;