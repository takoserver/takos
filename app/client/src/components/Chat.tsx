import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { fetchFollowing, fetchUserInfoBatch } from "./microblog/api.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatSettingsOverlay } from "./chat/ChatSettingsOverlay.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import { addMessageHandler, removeMessageHandler } from "../utils/ws.ts";
import { fetchDirectMessages, sendDirectMessage } from "./chat/api.ts";

export function Chat() {
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [showSettings, setShowSettings] = createSignal(false);

  const loadRooms = async () => {
    const me = account();
    if (!me) return;
    const following: string[] = await fetchFollowing(me.userName);
    const infos = await fetchUserInfoBatch(following);
    const list: Room[] = following.map((id, i) => ({
      id,
      name: infos[i]?.displayName || infos[i]?.userName || id,
      userName: infos[i]?.userName || id,
      domain: infos[i]?.domain || new URL(id).hostname,
      lastMessage: "",
      unreadCount: 0,
      type: "group",
      members: [id],
    }));
    setRooms(list);
  };

  const loadMessages = async (peerId: string) => {
    const me = account();
    if (!me) return;
    const list = await fetchDirectMessages(peerId, me.userName);
    setMessages(list);
  };

  onMount(() => {
    void loadRooms();
    addMessageHandler((msg) => {
      if (msg.type === "newMessage" && selectedRoom()) {
        void loadMessages(selectedRoom()!);
      }
    });
  });

  onCleanup(() => {
    removeMessageHandler();
  });

  createEffect(() => {
    const id = selectedRoom();
    if (id) void loadMessages(id);
  });

  const sendMessage = async () => {
    const text = newMessage().trim();
    const me = account();
    const peer = selectedRoom();
    if (!text || !me || !peer) return;
    const ok = await sendDirectMessage(me.userName, peer, text);
    if (ok) {
      setNewMessage("");
      await loadMessages(peer);
    }
  };

  const handleSelectRoom = (id: string) => {
    setSelectedRoom(id);
  };

  const currentRoom = () =>
    rooms().find((r) => r.id === selectedRoom()) || null;

  return (
    <div class="h-full flex text-white bg-[#1e1e1e]">
      <ChatRoomList
        rooms={rooms()}
        selectedRoom={selectedRoom()}
        onSelect={handleSelectRoom}
        showAds={false}
        segment="people"
        onSegmentChange={() => {}}
      />
      <Show when={currentRoom()}>
        <div class="flex-1 flex flex-col">
          <ChatTitleBar
            isMobile={false}
            selectedRoom={currentRoom()}
            onBack={() => setSelectedRoom(null)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <div class="flex-1 overflow-y-auto">
            <ChatMessageList
              messages={messages()}
              onReachTop={() => {}}
            />
          </div>
          <ChatSendForm
            newMessage={newMessage()}
            setNewMessage={setNewMessage}
            mediaFile={null}
            setMediaFile={() => {}}
            mediaPreview={null}
            setMediaPreview={() => {}}
            sendMessage={sendMessage}
            allowMedia={false}
          />
        </div>
      </Show>
      <ChatSettingsOverlay
        isOpen={showSettings()}
        room={currentRoom()}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
