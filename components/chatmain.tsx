import ChatTalkTitle from "../islands/ChatTalkTitle.tsx";
import ChatTalkContent from "../islands/ChatTalkContent.tsx";
import ChatSend from "../islands/ChatSend.tsx";
import ChatTalkTitleContent from "../islands/ChatTalkTitleContent.tsx";
import { AppStateType } from "../util/types.ts";
function chatmain({ state }: { state: AppStateType }) {
  return (
    <>
      <div class="p-talk-chat-main" id="chat-area">
        <div class="p-talk-chat-title hidden" id="chatHeader">
          <div class="p-1 h-full">
            <ChatTalkTitle state={state} />
          </div>
          <ChatTalkTitleContent state={state}></ChatTalkTitleContent>
        </div>
        <ChatTalkContent state={state} />
      </div>
      <ChatSend state={state} />
    </>
  );
}

export default chatmain;
