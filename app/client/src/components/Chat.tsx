import { createSignal, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { fetchFollowing, fetchUserInfoBatch } from "./microblog/api.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import { listDMMessages, sendDMMessage } from "./chat/api.ts";
import {
  addDMUpdateHandler,
  registerUser,
  removeDMUpdateHandler,
} from "../utils/ws.ts";
import { getDomain } from "../utils/config.ts";

interface FollowInfo {
  userName: string;
  displayName?: string;
  avatarInitial?: string;
  domain: string;
}

interface RawDM {
  from: string;
  to: string;
  content: string;
  createdAt: string;
}

export function Chat() {
  const [account] = useAtom(activeAccount);
  const [roomId, setRoomId] = useAtom(selectedRoomState);
  const [rooms, setRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [mediaFile, setMediaFile] = createSignal<File | null>(null);
  const [mediaPreview, setMediaPreview] = createSignal<string | null>(null);

  const selfHandle = () => {
    const acc = account();
    return acc ? `${acc.userName}@${getDomain()}` : "";
  };

  const loadRooms = async () => {
    const acc = account();
    if (!acc) return;
    const list = await fetchFollowing(acc.userName);
    const rs: Room[] = (list as FollowInfo[]).map((f) => {
      const handle = `${f.userName}@${f.domain}`;
      return {
        id: handle,
        name: f.displayName || f.userName,
        userName: f.userName,
        domain: f.domain,
        unreadCount: 0,
        avatar: f.avatarInitial,
        type: "group",
        members: [handle],
      };
    });
    setRooms(rs);
  };

  const openOrCreateRoom = async (id: string) => {
    const exists = rooms().some((r) => r.id === id);
    if (!exists) {
      const infos = await fetchUserInfoBatch([id]);
      const friend = infos[0] as FollowInfo | undefined;
      const userName = friend?.userName || id.split("@")[0];
      const domain = friend?.domain || id.split("@")[1] || "";
      const newRoom: Room = {
        id,
        name: friend?.displayName || userName,
        userName,
        domain,
        unreadCount: 0,
        avatar: friend?.avatarInitial,
        type: "group",
        members: [id],
      };
      setRooms((prev) => [...prev, newRoom]);
    }
    await selectRoom(id);
  };

  const loadMessages = async (id: string) => {
    if (!account()) return;
    const list = await listDMMessages(selfHandle(), id);
    const infos = await fetchUserInfoBatch([id]);
    const friend = infos[0];
    const arr: RawDM[] = Array.isArray(list) ? list as RawDM[] : [];
    const msgs: ChatMessage[] = arr.map((m, i) => ({
      id: String(i),
      author: m.from,
      displayName: m.from === selfHandle()
        ? account()!.displayName
        : friend?.displayName || id,
      address: m.from,
      content: m.content,
      timestamp: new Date(m.createdAt),
      type: "text",
      isMe: m.from === selfHandle(),
    }));
    setMessages(msgs);
  };

  const selectRoom = async (id: string) => {
    setRoomId(id);
    await loadMessages(id);
  };

  const sendMessage = async () => {
    if (!newMessage().trim() || !roomId() || !account()) return;
    await sendDMMessage(selfHandle(), roomId()!, newMessage());
    setNewMessage("");
    setMediaFile(null);
    setMediaPreview(null);
    await loadMessages(roomId()!);
  };

  onMount(() => {
    void loadRooms();
    const acc = account();
    if (acc) registerUser(`${acc.userName}@${getDomain()}`);
    const handler = async () => {
      if (roomId()) await loadMessages(roomId()!);
    };
    addDMUpdateHandler(handler);
    return () => removeDMUpdateHandler(handler);
  });

  return (
    <div class="flex flex-1 h-full bg-[#1e1e1e] overflow-hidden">
      <div class="w-[280px] border-r border-[#333] hidden md:block">
        <ChatRoomList
          rooms={rooms()}
          selectedRoom={roomId()}
          onSelect={selectRoom}
          showAds={false}
          segment="all"
          onSegmentChange={() => {}}
          onSelectFriend={(id) => void openOrCreateRoom(id)}
        />
      </div>
      <div class="flex-1 flex flex-col">
        <ChatTitleBar
          isMobile={false}
          selectedRoom={rooms().find((r) => r.id === roomId()) || null}
          onBack={() => setRoomId(null)}
          onOpenSettings={() => {}}
          showSettings={false}
        />
        <div class="flex-1 overflow-y-auto p-4">
          <Show
            when={roomId()}
            fallback={
              <p class="text-center text-gray-400">
                トークルームを選択してください
              </p>
            }
          >
            <ChatMessageList messages={messages()} onReachTop={() => {}} />
          </Show>
        </div>
        <Show when={roomId()}>
          <ChatSendForm
            newMessage={newMessage()}
            setNewMessage={setNewMessage}
            mediaFile={mediaFile()}
            setMediaFile={setMediaFile}
            mediaPreview={mediaPreview()}
            setMediaPreview={setMediaPreview}
            sendMessage={sendMessage}
          />
        </Show>
      </div>
    </div>
  );
}
