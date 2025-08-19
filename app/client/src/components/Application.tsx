import { createEffect, createSignal, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedAppState } from "../states/app.ts";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { Home } from "./Home.tsx";
import Profile from "./Profile.tsx";
import { Microblog } from "./Microblog.tsx";
import { Chat } from "./Chat.tsx";
import { Notifications } from "./Notifications.tsx";
import UnifiedToolsContent from "./home/UnifiedToolsContent.tsx";
import Header from "./header/header.tsx";
import { connectWebSocket, registerUser, addMessageHandler, removeMessageHandler } from "../utils/ws.ts";
import { getDomain } from "../utils/config.ts";

export function Application() {
  const [selectedApp] = useAtom(selectedAppState);
  const [selectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [isMobile, setIsMobile] = createSignal(false);

  // モバイルかどうかを判定
  onMount(() => {
    const checkMobile = () => {
      setIsMobile(globalThis.innerWidth <= 768);
    };

    checkMobile();
    globalThis.addEventListener("resize", checkMobile);
    connectWebSocket();

    return () => globalThis.removeEventListener("resize", checkMobile);
  });

  createEffect(() => {
    const user = account();
    if (user) {
      registerUser(`${user.userName}@${getDomain()}`);
    }
  });

  // Global websocket message handler: dispatch custom events for specific types
  onMount(() => {
    const h = (msg: unknown) => {
      try {
        const m = msg as { type?: string; payload?: unknown };
        if (m.type === "keyPackageLow") {
          const ev = new CustomEvent("keyPackageLow", { detail: m.payload });
          globalThis.dispatchEvent(ev as unknown as Event);
        }
      } catch (_e) {
        // noop
      }
    };
    addMessageHandler(h);
    return () => {
      removeMessageHandler(h);
    };
  });

  // チャットページかつスマホ版かつチャンネルが選択されている場合にヘッダーが非表示の場合のクラス名を生成
  const wrapperClass = () => {
    const isChat = selectedApp() === "chat";
    const isChatWithRoom = isChat && isMobile() && selectedRoom() !== null;

    if (isChatWithRoom) {
      // チャット画面で部屋が選択されている場合は全画面表示
      return "flex flex-col flex-1 box-border overflow-hidden h-dvh p-0";
    }

    return [
      "flex flex-col flex-1 box-border overflow-y-auto min-h-dvh h-dvh",
      isMobile() ? "p-0 pb-16 overflow-x-clip" : "pl-[78px]",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <>
      <Header />
      <main id="main" class={wrapperClass()}>
        <Show when={selectedApp() === "home"}>
          <Home />
        </Show>
        <Show when={selectedApp() === "profile"}>
          <Profile />
        </Show>
        <Show when={selectedApp() === "microblog"}>
          <Microblog />
        </Show>
        <Show when={selectedApp() === "chat"}>
          <Chat />
        </Show>
        <Show when={selectedApp() === "tools"}>
          <div class="text-gray-100">
            <div class="p-6">
              <UnifiedToolsContent />
            </div>
          </div>
        </Show>
        <Show when={selectedApp() === "notifications"}>
          <Notifications />
        </Show>
      </main>
    </>
  );
}
