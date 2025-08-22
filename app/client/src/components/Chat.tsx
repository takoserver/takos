import { createEffect, createSignal, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import {
  fetchMessages,
  searchRooms,
  sendMessage as sendPlainMessage,
} from "./chat/api.ts";
import { getDomain } from "../utils/config.ts";

export function Chat() {
  const [account] = useAtom(activeAccount);
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [segment, setSegment] = createSignal<"all" | "people" | "groups">(
    "all",
  );

  const loadRooms = async () => {
    const user = account();
    if (!user) return;
    const list = await searchRooms(user.userName);
    const self = `${user.userName}@${getDomain()}`;
    const roomList: Room[] = list.map((r) => ({
      id: r.id,
      name: r.id,
      userName: user.userName,
      domain: getDomain(),
      unreadCount: 0,
      type: "group",
      members: [self],
    }));
    setRooms(roomList);
  };

  onMount(() => {
    void loadRooms();
  });

  createEffect(() => {
    const roomId = selectedRoom();
    if (roomId) {
      void loadMessages(roomId);
    }
  });

  const loadMessages = async (roomId: string) => {
    const list = await fetchMessages(roomId);
    const me = account();
    const self = me ? `${me.userName}@${getDomain()}` : "";
    const msgs: ChatMessage[] = list.map((m) => ({
      id: m.id,
      author: m.sender,
      displayName: m.sender,
      address: m.sender,
      content: m.content,
      timestamp: new Date(m.createdAt),
      type: "text",
      isMe: m.sender === self,
    }));
    setMessages(msgs);
  };

  const handleSend = async () => {
    const text = newMessage().trim();
    const roomId = selectedRoom();
    const user = account();
    if (!text || !roomId || !user) return;
    const me = `${user.userName}@${getDomain()}`;
    const ok = await sendPlainMessage(roomId, me, [me], text);
    if (ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          author: me,
          displayName: user.displayName || user.userName,
          address: me,
          content: text,
          timestamp: new Date(),
          type: "text",
          isMe: true,
        },
      ]);
      setNewMessage("");
    }
  };

  return (
    <div class="flex flex-1 h-full">
      <div class="w-72 border-r border-[#333]">
        <ChatRoomList
          rooms={rooms()}
          selectedRoom={selectedRoom()}
          onSelect={(id) => setSelectedRoom(id)}
          showAds={false}
          onCreateRoom={() => {}}
          segment={segment()}
          onSegmentChange={setSegment}
        />
      </div>
      <Show when={selectedRoom()}>
        <div class="flex flex-col flex-1">
          <ChatTitleBar
            isMobile={false}
            selectedRoom={rooms().find((r) => r.id === selectedRoom()) ?? null}
            onBack={() => setSelectedRoom(null)}
            onOpenSettings={() => {}}
          />
          <ChatMessageList
            messages={messages()}
            onReachTop={() => {}}
          />
          <ChatSendForm
            newMessage={newMessage()}
            setNewMessage={setNewMessage}
            mediaFile={null}
            setMediaFile={() => {}}
            mediaPreview={null}
            setMediaPreview={() => {}}
            sendMessage={handleSend}
            allowMedia={false}
          />
        </div>
      </Show>
    </div>
  );
}
