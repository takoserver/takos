import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { useAtom } from "solid-jotai";
function ChatTalkMain() {
  return (
    <>
      <div class="pl-2">
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
