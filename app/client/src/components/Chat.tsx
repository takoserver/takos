import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { fetchFollowing, fetchUserInfoBatch } from "./microblog/api.ts";
import { apiFetch, getDomain } from "../utils/config.ts";
import { addMessageHandler, removeMessageHandler } from "../utils/ws.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";

function toHandle(user: unknown): string {
  if (typeof user === "string") return user;
  if (user && typeof user === "object") {
    const u = user as { userName?: string; domain?: string };
    if (u.userName && u.domain) return `${u.userName}@${u.domain}`;
    if (u.userName) return `${u.userName}@${getDomain()}`;
  }
  return String(user);
}

export function Chat() {
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<Record<string, ChatMessage[]>>(
    {},
  );
  const [newMessage, setNewMessage] = createSignal("");
  const [segment, setSegment] = createSignal<"all" | "people" | "groups">(
    "all",
  );
  const [mediaFile, setMediaFile] = createSignal<File | null>(null);
  const [mediaPreview, setMediaPreview] = createSignal<string | null>(null);
  const [isMobile, setIsMobile] = createSignal(false);

  const meHandle = () => {
    const acc = account();
    return acc ? `${acc.userName}@${getDomain()}` : "";
  };

  const loadRooms = async () => {
    const acc = account();
    if (!acc) return;
    const following = await fetchFollowing(acc.userName);
    const handles = following.map((f) => toHandle(f));
    const infos = await fetchUserInfoBatch(handles, acc.id);
    const rs = handles.map((h, i) => {
      const [userName, domain = ""] = h.split("@");
      const info = infos[i];
      return {
        id: h,
        name: h,
        displayName: info?.displayName || h,
        userName,
        domain,
        unreadCount: 0,
        members: [h],
        avatar: info?.authorAvatar,
        type: "group",
      } as Room;
    });
    setRooms(rs);
  };

  const loadMessages = async (roomId: string) => {
    const acc = account();
    if (!acc) return;
    const me = meHandle();
    const params = new URLSearchParams({ user1: me, user2: roomId });
    const res = await apiFetch(`/api/dm?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    interface RawMessage {
      id?: string;
      _id?: string;
      from: string;
      to: string;
      content: string;
      createdAt: string;
    }
    const list: ChatMessage[] = Array.isArray(data)
      ? (data as RawMessage[]).map((m) => ({
        id: m.id || m._id || crypto.randomUUID(),
        author: m.from,
        displayName: m.from,
        address: m.from,
        content: m.content,
        timestamp: new Date(m.createdAt),
        type: "text",
        isMe: m.from === me,
      }))
      : [];
    setMessages((prev) => ({ ...prev, [roomId]: list }));
  };

  const sendMessage = async () => {
    const text = newMessage().trim();
    const roomId = selectedRoom();
    const acc = account();
    if (!roomId || !acc || text === "") return;
    const me = meHandle();
    await apiFetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: me, to: roomId, content: text }),
    });
    setNewMessage("");
  };

  const handleWs = (data: unknown) => {
    interface WsEnvelope {
      type?: string;
      payload?: unknown;
    }
    const msg = data as WsEnvelope;
    if (msg.type !== "dm") return;
    const p = msg.payload as {
      id: string;
      from: string;
      to: string;
      content: string;
      createdAt?: string;
    };
    const me = meHandle();
    const other = p.from === me ? p.to : p.from;
    const message: ChatMessage = {
      id: p.id || crypto.randomUUID(),
      author: p.from,
      displayName: p.from,
      address: p.from,
      content: p.content,
      timestamp: p.createdAt ? new Date(p.createdAt) : new Date(),
      type: "text",
      isMe: p.from === me,
    };
    setMessages((prev) => {
      const arr = prev[other] ? [...prev[other], message] : [message];
      return { ...prev, [other]: arr };
    });
    setRooms((rs) =>
      rs.map((r) =>
        r.id === other
          ? {
            ...r,
            lastMessage: p.content,
            lastMessageTime: new Date(),
            unreadCount: r.id === selectedRoom()
              ? r.unreadCount
              : r.unreadCount + (selectedRoom() === other ? 0 : 1),
          }
          : r
      )
    );
  };

  const checkMobile = () => setIsMobile(globalThis.innerWidth <= 768);

  onMount(() => {
    checkMobile();
    globalThis.addEventListener("resize", checkMobile);
    loadRooms();
    addMessageHandler(handleWs);
  });

  onCleanup(() => {
    removeMessageHandler(handleWs);
    globalThis.removeEventListener("resize", checkMobile);
  });

  createEffect(() => {
    const roomId = selectedRoom();
    if (roomId && !messages()[roomId]) {
      void loadMessages(roomId);
    }
  });

  const currentMessages = () => messages()[selectedRoom() ?? ""] ?? [];
  const selectedRoomObj = () =>
    rooms().find((r) => r.id === selectedRoom()) || null;

  return (
    <div class="flex h-full">
      <div
        class={selectedRoom() && isMobile()
          ? "hidden md:block md:w-64"
          : "w-full md:w-64"}
      >
        <ChatRoomList
          rooms={rooms()}
          selectedRoom={selectedRoom()}
          onSelect={(id) => setSelectedRoom(id)}
          showAds={false}
          onCreateRoom={() => {}}
          segment={segment()}
          onSegmentChange={setSegment}
          onCreateFriendRoom={(id) => setSelectedRoom(id)}
        />
      </div>
      <div
        class={selectedRoom()
          ? "flex flex-col flex-1"
          : "hidden md:flex md:flex-col md:flex-1"}
      >
        <ChatTitleBar
          isMobile={isMobile()}
          selectedRoom={selectedRoomObj()}
          onBack={() => setSelectedRoom(null)}
          onOpenSettings={() => {}}
          showSettings={false}
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
          mediaFile={mediaFile()}
          setMediaFile={setMediaFile}
          mediaPreview={mediaPreview()}
          setMediaPreview={setMediaPreview}
          sendMessage={sendMessage}
          allowMedia={false}
        />
      </div>
    </div>
  );
}

export default Chat;
