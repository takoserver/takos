import ChatTalkTitle from "../islands/ChatTalkTitle.tsx"
import ChatTalkContent from "../islands/ChatTalkContent.tsx"
import ChatSend from "../islands/ChatSend.tsx"
import ChatTalkTitleContent from "../islands/ChatTalkTitleContent.tsx"
function chatmain({ userName }: { userName: string }) {
  return (
    <>
      <div class="p-talk-chat-main" id="chat-area">
        <div class="p-talk-chat-title">
          <div class="p-1 h-full">
            <ChatTalkTitle />
          </div>
          <ChatTalkTitleContent>a</ChatTalkTitleContent>
        </div>
        <ChatTalkContent userName={userName} />
      </div>
      <ChatSend />
    </>
  )
}

export default chatmain
