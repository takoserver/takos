import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatSettingsOverlay } from "./chat/ChatSettingsOverlay.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import { addMessageHandler, removeMessageHandler } from "../utils/ws.ts";
import { apiFetch, getDomain } from "../utils/config.ts";

export function Chat() {
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<Record<string, ChatMessage[]>>(
    {},
  );
  const [newMessage, setNewMessage] = createSignal("");
  const [showSettings, setShowSettings] = createSignal(false);
  const [segment, setSegment] = createSignal<"all" | "people" | "groups">(
    "all",
  );

  const me = () => {
    const user = account();
    return user ? `${user.userName}@${getDomain()}` : "";
  };

  const ensureRoom = (id: string) => {
    if (!rooms().some((r) => r.id === id)) {
      const [userName, domain] = id.split("@");
      setRooms((prev) => [
        ...prev,
        {
          id,
          name: id,
          userName,
          domain,
          unreadCount: 0,
          members: [me(), id],
          type: "group",
        },
      ]);
    }
  };

  const loadMessages = async (id: string) => {
    const from = me();
    if (!from) return;
    const res = await apiFetch(
      `/api/dm?user1=${encodeURIComponent(from)}&user2=${
        encodeURIComponent(id)
      }`,
    );
    if (!res.ok) return;
    const list = await res.json() as {
      _id: string;
      from: string;
      to: string;
      content: string;
      createdAt: string;
    }[];
    const msgs: ChatMessage[] = list.map((m) => ({
      id: m._id,
      author: m.from,
      displayName: m.from,
      address: m.from,
      content: m.content,
      timestamp: new Date(m.createdAt),
      type: "text",
      isMe: m.from === from,
    }));
    setMessages((prev) => ({ ...prev, [id]: msgs }));
  };

  const handleWs = (data: unknown) => {
    if (typeof data !== "object" || data === null) return;
    const msg = data as { type?: string; payload?: unknown };
    if (
      msg.type !== "dm" || typeof msg.payload !== "object" ||
      msg.payload === null
    ) {
      return;
    }
    const payload = msg.payload as {
      id: string;
      from: string;
      to: string;
      content: string;
    };
    const self = me();
    const other = payload.from === self ? payload.to : payload.from;
    ensureRoom(other);
    const chatMsg: ChatMessage = {
      id: payload.id,
      author: payload.from,
      displayName: payload.from,
      address: payload.from,
      content: payload.content,
      timestamp: new Date(),
      type: "text",
      isMe: payload.from === self,
    };
    setMessages((prev) => ({
      ...prev,
      [other]: [...(prev[other] ?? []), chatMsg],
    }));
    setRooms((prev) =>
      prev.map((r) =>
        r.id === other
          ? {
            ...r,
            lastMessage: payload.content,
            lastMessageTime: new Date(),
            unreadCount: r.id === selectedRoom() || payload.from === self
              ? 0
              : r.unreadCount + 1,
          }
          : r
      )
    );
  };

  onMount(() => addMessageHandler(handleWs));
  onCleanup(() => removeMessageHandler(handleWs));

  createEffect(() => {
    const id = selectedRoom();
    if (id) {
      ensureRoom(id);
      void loadMessages(id);
      setRooms((prev) =>
        prev.map((r) => r.id === id ? { ...r, unreadCount: 0 } : r)
      );
    }
  });

  const sendMessage = async () => {
    const text = newMessage().trim();
    const id = selectedRoom();
    const from = me();
    if (!text || !id || !from) return;
    const res = await apiFetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: id, content: text }),
    });
    if (res.ok) {
      const doc = await res.json() as { id: string };
      const msg: ChatMessage = {
        id: doc.id,
        author: from,
        displayName: from,
        address: from,
        content: text,
        timestamp: new Date(),
        type: "text",
        isMe: true,
      };
      setMessages((prev) => ({
        ...prev,
        [id]: [...(prev[id] ?? []), msg],
      }));
      setRooms((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, lastMessage: text, lastMessageTime: new Date() }
            : r
        )
      );
      setNewMessage("");
    }
  };

  const currentRoom = () =>
    rooms().find((r) => r.id === selectedRoom()) ?? null;
  const currentMessages = () => {
    const id = selectedRoom();
    return id ? messages()[id] ?? [] : [];
  };

  return (
    <>
      <div class="flex h-full">
        <div class="w-60 border-r border-[#333] overflow-y-auto">
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
        <div class="flex-1 flex flex-col relative">
          <ChatTitleBar
            isMobile={false}
            selectedRoom={currentRoom()}
            onBack={() => setSelectedRoom(null)}
            onOpenSettings={() => setShowSettings(true)}
          />
          <div class="flex-1 overflow-y-auto">
            <ChatMessageList
              messages={currentMessages()}
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
      </div>
      <ChatSettingsOverlay
        isOpen={showSettings()}
        room={currentRoom()}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
