import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { 
  messageListState,
  messageValueState,
} from "../utils/state.ts"
import { useAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx"
import ChatOtherMessage from "./OtherMessage.tsx";

const myuserName = localStorage.getItem("userName") + "@" + (document.location.hostname)

function ChatTalkMain() {
  const [messageList] = useAtom(messageListState);
  const [messageValue] = useAtom(messageValueState);
  return (
    <>
      <div class="pl-2">
        {messageList().map((message) => {
          let value = messageValue().find((value) => value[0] === message.messageid)
          if(!value) {
            value = [message.messageid, {
              userId: message.userName,
              message: "取得に失敗しました",
              type: "text",
              timestamp: message.timestamp,
              isEncrypted: false,
              isSigned: false,
            }]
          }
          return (
            <>
            {message.userName === myuserName && (
              <>
                <ChatSendMessage
                    time={message.timestamp}
                    message={value[1].message}
                    isPrimary={true}
                    isSendPrimary={true}
                />
              </>
            )}

            {message.userName !== myuserName && (
              <>
                <ChatOtherMessage
                    time={message.timestamp}
                    message={value[1].message}
                    isPrimary={true}
                    isSendPrimary={true}
                    name={message.userName}
                />
              </>
            )}
            </>
          );
        })}
      </div>
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
