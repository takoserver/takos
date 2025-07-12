import { createEffect, createSignal, onMount } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedAppState } from "../states/app.ts";
import { selectedRoomState } from "../states/chat.ts";
import { Home } from "./Home.tsx";
import { Microblog } from "./Microblog.tsx";
import { Chat } from "./Chat.tsx";
import { Videos } from "./Videos.tsx";
import UnifiedToolsContent from "./home/UnifiedToolsContent.tsx";
import Header from "./header/header.tsx";
import { Route, Routes, useLocation } from "@solidjs/router";
import PostView from "./microblog/PostView.tsx";
import UserProfile from "./UserProfile.tsx";

interface ApplicationProps {
  onShowEncryptionKeyForm?: () => void;
}

export function Application(props: ApplicationProps) {
  const [selectedApp, setSelectedApp] = useAtom(selectedAppState);
  const [selectedRoom] = useAtom(selectedRoomState);
  const [isMobile, setIsMobile] = createSignal(false);
  const location = useLocation();

  // モバイルかどうかを判定
  onMount(() => {
    const checkMobile = () => {
      setIsMobile(globalThis.innerWidth <= 768);
    };

    checkMobile();
    globalThis.addEventListener("resize", checkMobile);

    return () => globalThis.removeEventListener("resize", checkMobile);
  });

  // チャットページかつスマホ版かつチャンネルが選択されている場合にヘッダーが非表示の場合のクラス名を生成
  const wrapperClass = () => {
    const baseClass = "wrapper";
    const isHeaderHidden = selectedApp() === "chat" && isMobile() &&
      selectedRoom() !== null;
    return isHeaderHidden ? `${baseClass} no-header` : baseClass;
  };

  createEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/chat")) setSelectedApp("chat");
    else if (path.startsWith("/microblog")) setSelectedApp("microblog");
    else if (path.startsWith("/videos")) setSelectedApp("videos");
    else if (path.startsWith("/tools")) setSelectedApp("tools");
    else setSelectedApp("home");
  });

  return (
    <>
      <Header />
      <main class={wrapperClass()}>
        <Routes>
          <Route
            path="/"
            element={
              <Home onShowEncryptionKeyForm={props.onShowEncryptionKeyForm} />
            }
          />
          <Route path="/microblog" component={Microblog} />
          <Route path="/microblog/:id" component={PostView} />
          <Route
            path="/chat"
            element={
              <Chat onShowEncryptionKeyForm={props.onShowEncryptionKeyForm} />
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <Chat onShowEncryptionKeyForm={props.onShowEncryptionKeyForm} />
            }
          />
          <Route
            path="/tools"
            element={
              <div class="text-gray-100">
                <div class="p-6">
                  <UnifiedToolsContent />
                </div>
              </div>
            }
          />
          <Route path="/videos" component={Videos} />
          <Route path="/user/:username" component={UserProfile} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  );
}
