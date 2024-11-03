import ChatHeader from "./Chat/header.tsx";
import TalkListHeader from "./Chat/talkListHeader";
import { SideBer } from "./Chat/SideBar.tsx";
import { SetUp } from "./Chat/SetUp.tsx";
import { EncryptSession } from "./Chat/EncryptSession.tsx";
export function Chat() {
  return (
    <>
      <ChatHeader />
      <SetUp />
      <EncryptSession />
      <div class="wrapper w-full">
        <main
          class="p-talk"
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
            <div class="p-talk-chat-container">
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
