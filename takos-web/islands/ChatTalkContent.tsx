import ChatDate from "../components/ChatDate.tsx";
import ChatSendMessage from "../components/SendMessage.tsx";
import { AppStateType } from "../util/types.ts";
import { splitUserName } from "../util/takosClient.ts";
import { editScrollAddLatestMessage } from "../util/messageDOM.ts";
interface Messages {
  messageid: string;
  userName: string;
  messages: string;
  timestamp: string;
  type: string;
}

function ChatTalkMain({ state }: { state: AppStateType }) {
  return (
    <>
      <div class="pl-2">

      </div>
    </>
  );
}

function ChatTalk({ state }: { state: AppStateType }) {
  if (state.isChoiceUser.value === true) {
    return (
      <ul className="c-talk-chat-list">
        <ChatTalkMain state={state} />
      </ul>
    );
  } else {
    return (
      <div className="flex w-full h-full">
        <p className="m-auto">友達を選択してください</p>
      </div>
    );
  }
}

export default ChatTalk;
