
import { SideBer } from "./SideBar.tsx";
import { SetUp } from "./SetUp.tsx";
import { EncryptSession } from "./EncryptSession.tsx";
import ChatSend from "./ChatSend.tsx";
import ChatTalkTitle from "./ChatTalkTitle.tsx";
import ChatTalkContent from "./ChatTalkContent.tsx";
import ChatTalkTitleContent from "./ChatTalkTitleContent.tsx";
import { isSelectRoomState } from "../utils/roomState.ts";
import { atom, useAtom } from "solid-jotai";
import { SettingRoom } from "./SettingRoom.tsx";
import { createSignal, onMount } from "solid-js";
import TalkListHeader from "./talkListHeader.tsx";
import ChatHeader from "./header.tsx";

export const openConfig = atom(false);

export function Chat() {
  const [isSelectRoom] = useAtom(isSelectRoomState);
  const [open, setOpen] = useAtom(openConfig);
  const [isMobile, setIsMobile] = createSignal(window.innerWidth <= 768);

  // 画面サイズの変更を検知
  onMount(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  return (
    <>
      <ChatHeader />
      <SetUp />
      <EncryptSession />
      <div class="wrapper w-full">
        <main
          class={`p-talk ${isSelectRoom() ? "is-inview" : ""} flex`}
          id="chatmain"
        >
          <div class="p-talk-list min-h-screen">
            <TalkListHeader />
            <div class="p-talk-list-rooms pb-14">
              <ul class="p-talk-list-rooms__ul h-[calc(100vh-120px)] overflow-y-auto pb-[70px]">
                <SideBer />
              </ul>
            </div>
          </div>
          <div class="p-talk-chat">
            <div class="p-talk-chat-container min-h-dvh">
              <div class="p-talk-chat-main overflow-y-auto h-[300px]">
                <div
                  class={`p-talk-chat-title ${isSelectRoom() ? "" : "hidden"}`}
                  id="chatHeader"
                >
                  <div class="p-1 h-full">
                    <ChatTalkTitle />
                  </div>
                  <ChatTalkTitleContent />
                  {isMobile() && !open() && isSelectRoom() && (
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
          {/* デスクトップでは設定パネルを常に表示、モバイルでは別のコンポーネントで表示 */}
          {!isMobile() && <SettingRoom />}
        </main>
      </div>
      {/* モバイル版でのみ表示されるポップアップ */}
      {isMobile() && <SettingRoom />}
    </>
  );
}
