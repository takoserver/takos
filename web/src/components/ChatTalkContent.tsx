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
  return (
    <>
        <div class="pl-2">
          <div class="overflow-y-auto">
          {messageList().map((message) => {
            return (
              <>
              <Message messageid={message.messageid} myMessage={message.userName === myuserName} time={message.timestamp} userName={message.userName} />
              </>
            );
          })}
          </div>
        </div>
    </>
  );
}

import { onMount } from "solid-js";

function Message({ messageid, myMessage, time, userName }: { messageid: string, myMessage: boolean, time: string, userName: string }) {
  const [messageValue, setMessageValue] = createSignal<{
    verified: boolean;
    encrypted: boolean;
    content: string;
    type: string;
    timestamp: string;
  }>({ verified: false, encrypted: false, content: "読み込み中", type: "text", timestamp: time });
  onMount(async () => {
    try {
      const value = await getMessage(messageid);
      console.log(value);
      setMessageValue(value);
    } catch (e) {
      setMessageValue({ verified: false, encrypted: false, content: "読み込みエラー", type: "text", timestamp: time });
      console.log("error", e);
    }
  });
  return (
    <>
      {myMessage &&
        <ChatSendMessage
          time={time}
          message={messageValue}
          isPrimary={true}
          isSendPrimary={true}
        />
      }
      {!myMessage &&
        <ChatOtherMessage
          name={userName}
          time={time}
          message={messageValue}
          isPrimary={true}
        />
      }
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
