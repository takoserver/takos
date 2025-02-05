import ChatHeader from "./Chat/header.tsx";
import TalkListHeader from "./Chat/talkListHeader";
import { SideBer } from "./Chat/SideBar.tsx";
import { SetUp } from "./Chat/SetUp.tsx";
import { EncryptSession } from "./Chat/EncryptSession.tsx";
import ChatSend from "./Chat/ChatSend.tsx";
import ChatTalkTitle from "./ChatTalkTitle.tsx";
import ChatTalkContent from "./ChatTalkContent.tsx";
import ChatTalkTitleContent from "./ChatTalkTitleContent.tsx";
import { isSelectRoomState } from "../utils/roomState.ts";
import { useAtom } from "solid-jotai";
export function Chat() {
  const [isSelectRoom] = useAtom(isSelectRoomState);
  return (
    <>
      <ChatHeader />
      <SetUp />
      <EncryptSession />
      <div class="wrapper w-full">
        <main
          class={`p-talk ${isSelectRoom() ? "is-inview" : ""}`}
          id="chatmain"
        >
          <div class="p-talk-list min-h-screen">
            <TalkListHeader />
            <div class="p-talk-list-rooms">
              <ul class="p-talk-list-rooms__ul">
                <SideBer />
              </ul>
            </div>
          </div>
          <div class="p-talk-chat">
            <div class="p-talk-chat-container min-h-screen">
              <div class="p-talk-chat-main overflow-y-auto h-[300px]">
                <div
                  class={`p-talk-chat-title ${isSelectRoom() ? "" : "hidden"}`}
                  id="chatHeader"
                >
                  <div class="p-1 h-full">
                    <ChatTalkTitle />
                  </div>
                </div>
                <ChatTalkTitleContent />
                <div class="mt-[54px]"></div>
                <ChatTalkContent />
              </div>
              <ChatSend />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
