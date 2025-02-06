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
import { atom, useAtom } from "solid-jotai";
export const openConfig = atom(false);
export function Chat() {
  const [isSelectRoom] = useAtom(isSelectRoomState);
  const [open, setOpen] = useAtom(openConfig);
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
                  <ChatTalkTitleContent />
                  {!open() && isSelectRoom() && (
                    <div
                      class="absolute right-7 cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => setOpen(true)}
                    >
                      <span class="block w-7 h-0.5 bg-white mb-[5px]"></span>
                      <span class="block w-7 h-0.5 bg-white mb-[5px]"></span>
                      <span class="block w-7 h-0.5 bg-white"></span>
                    </div>
                  )}
                </div>
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
