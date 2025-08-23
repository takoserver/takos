import { createEffect, createSignal } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { getDomain } from "../utils/config.ts";
import { fetchDirectMessages, sendDirectMessage } from "./chat/api.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import { ChatSettingsOverlay } from "./chat/ChatSettingsOverlay.tsx";

export function Chat() {
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [mediaFile, setMediaFile] = createSignal<File | null>(null);
  const [mediaPreview, setMediaPreview] = createSignal<string | null>(null);
  const [isSettingsOpen, setSettingsOpen] = createSignal(false);

  // アカウントのフォロー/フォロワーから友だち候補ルームを生成
  createEffect(() => {
    const acc = account();
    if (!acc) return;
    const friends = Array.from(
      new Set([...(acc.following || []), ...(acc.followers || [])]),
    );
    const list: Room[] = friends.map((f) => ({
      id: f,
      name: f,
      userName: f.split("@")[0] ?? f,
      domain: f.includes("@") ? f.split("@")[1] : "",
      unreadCount: 0,
      type: "group",
      members: [f],
    }));
    setRooms(list);
  });

  // 選択中ルームのメッセージを取得
  createEffect(async () => {
    const acc = account();
    const peer = selectedRoom();
    if (!acc || !peer) {
      setMessages([]);
      return;
    }
    const selfHandle = `${acc.userName}@${getDomain()}`;
    const objs = await fetchDirectMessages(selfHandle, peer);
    const list: ChatMessage[] = objs.map((o) => ({
      id: o.id,
      author: o.attributedTo,
      displayName: o.attributedTo,
      address: o.attributedTo,
      content: o.content ?? "",
      timestamp: new Date(o.published),
      type: "text",
      isMe: o.attributedTo === selfHandle,
    }));
    setMessages(list);
  });

  const sendMessage = async () => {
    const acc = account();
    const room = rooms().find((r) => r.id === selectedRoom());
    if (!acc || !room) return;
    const selfHandle = `${acc.userName}@${getDomain()}`;
    const ok = await sendDirectMessage(selfHandle, room.members, newMessage());
    if (ok) {
      setNewMessage("");
      setMediaFile(null);
      setMediaPreview(null);
      const objs = await fetchDirectMessages(selfHandle, room.id);
      const list: ChatMessage[] = objs.map((o) => ({
        id: o.id,
        author: o.attributedTo,
        displayName: o.attributedTo,
        address: o.attributedTo,
        content: o.content ?? "",
        timestamp: new Date(o.published),
        type: "text",
        isMe: o.attributedTo === selfHandle,
      }));
      setMessages(list);
    }
  };

  return (
    <div class="flex h-full text-white">
      <ChatRoomList
        rooms={rooms()}
        selectedRoom={selectedRoom()}
        onSelect={setSelectedRoom}
      />
      <div class="flex flex-col flex-1">
        <ChatTitleBar
          isMobile={false}
          selectedRoom={rooms().find((r) => r.id === selectedRoom()) ?? null}
          onBack={() => setSelectedRoom(null)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <ChatMessageList messages={messages()} onReachTop={() => {}} />
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
        <ChatSettingsOverlay
          isOpen={isSettingsOpen()}
          room={rooms().find((r) => r.id === selectedRoom()) ?? null}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </div>
  );
}
