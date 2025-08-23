import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedRoomState } from "../states/chat.ts";
import { activeAccount } from "../states/account.ts";
import { fetchFollowing, fetchUserInfoBatch } from "./microblog/api.ts";
import { apiFetch, getDomain } from "../utils/config.ts";
import { addMessageHandler, removeMessageHandler } from "../utils/ws.ts";
import { ChatRoomList } from "./chat/ChatRoomList.tsx";
import { ChatTitleBar } from "./chat/ChatTitleBar.tsx";
import { ChatSettingsOverlay } from "./chat/ChatSettingsOverlay.tsx";
import { ChatMessageList } from "./chat/ChatMessageList.tsx";
import { ChatSendForm } from "./chat/ChatSendForm.tsx";
import type { ChatMessage, Room } from "./chat/types.ts";
import { isAdsenseEnabled, loadAdsenseConfig } from "../utils/adsense.ts";
function _parseActivityPubContent(text: string): string {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object" && typeof obj.content === "string") {
      return obj.content;
    }
  } catch {
    /* ignore */
  }
  return text;
}

interface ActivityPubAttachment {
  url: string;
  mediaType: string;
  preview?: {
    url?: string;
    mediaType?: string;
    width?: number;
    height?: number;
  };
}

interface ParsedActivityPubNote {
  content: string;
  attachments?: ActivityPubAttachment[];
}

function parseActivityPubNote(text: string): ParsedActivityPubNote {
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object" && typeof obj.content === "string") {
      const rawAtt = (obj as { attachment?: unknown }).attachment;
      const attachments = Array.isArray(rawAtt)
        ? rawAtt
          .map((a: unknown) => {
            if (
              a && typeof a === "object" &&
              typeof (a as { url?: unknown }).url === "string"
            ) {
              const mediaType =
                typeof (a as { mediaType?: unknown }).mediaType === "string"
                  ? (a as { mediaType: string }).mediaType
                  : "application/octet-stream";
              const rawPrev = (a as { preview?: unknown }).preview;
              let preview: ActivityPubAttachment["preview"];
              if (
                rawPrev && typeof rawPrev === "object" &&
                typeof (rawPrev as { url?: unknown }).url === "string"
              ) {
                preview = {
                  url: (rawPrev as { url: string }).url,
                  mediaType:
                    typeof (rawPrev as { mediaType?: unknown }).mediaType ===
                        "string"
                      ? (rawPrev as { mediaType: string }).mediaType
                      : undefined,
                  width: typeof (rawPrev as { width?: unknown }).width ===
                      "number"
                    ? (rawPrev as { width: number }).width
                    : undefined,
                  height: typeof (rawPrev as { height?: unknown }).height ===
                      "number"
                    ? (rawPrev as { height: number }).height
                    : undefined,
                };
              }
              return { url: (a as { url: string }).url, mediaType, preview };
            }
            return null;
          })
          .filter((a): a is ActivityPubAttachment => !!a)
        : undefined;
      return { content: obj.content, attachments };
    }
  } catch {
    /* ignore */
  }
  return { content: text };
}

interface DMRecord {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt?: string;
}

async function uploadFile(data: {
  content: ArrayBuffer;
  mediaType?: string;
  name?: string;
}): Promise<string | null> {
  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([data.content], { type: data.mediaType }),
      data.name ?? "file",
    );
    const res = await apiFetch("/api/files", { method: "POST", body: form });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.url === "string" ? d.url : null;
  } catch (err) {
    console.error("Error uploading attachment:", err);
    return null;
  }
}

export function Chat() {
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [account] = useAtom(activeAccount);
  const [chatRooms, setChatRooms] = createSignal<Room[]>([]);
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = createSignal("");
  const [mediaFile, setMediaFile] = createSignal<File | null>(null);
  const [mediaPreview, setMediaPreview] = createSignal<string | null>(null);
  const [showSettings, setShowSettings] = createSignal(false);
  const [segment, setSegment] = createSignal<"all" | "people" | "groups">(
    "all",
  );
  const [showAds, setShowAds] = createSignal(false);

  const selfHandle = () => {
    const user = account();
    return user ? `${user.userName}@${getDomain()}` : "";
  };

  const loadRooms = async () => {
    const user = account();
    if (!user) return;
    const following: string[] = await fetchFollowing(user.userName);
    const infos = await fetchUserInfoBatch(following, user.id);
    const rooms = following.map((id, idx) => {
      const info = infos[idx];
      return {
        id,
        name: info?.displayName || id,
        displayName: info?.displayName || id,
        userName: user.userName,
        domain: getDomain(),
        unreadCount: 0,
        type: "group",
        members: [id],
        avatar: info?.avatar,
      } as Room;
    });
    setChatRooms(rooms);
  };

  const loadMessages = async (room: Room) => {
    const user = account();
    if (!user) return;
    const res = await apiFetch(
      `/api/dm?user1=${encodeURIComponent(selfHandle())}&user2=${
        encodeURIComponent(room.id)
      }`,
    );
    if (!res.ok) return;
    const list = await res.json() as DMRecord[];
    const msgs: ChatMessage[] = list.map((m) => {
      const parsed = parseActivityPubNote(m.content);
      return {
        id: m.id,
        author: m.from,
        displayName: m.from === selfHandle()
          ? user.displayName || user.userName
          : room.displayName || room.id,
        address: m.from,
        content: parsed.content,
        attachments: parsed.attachments?.map((a) => ({
          url: a.url,
          mediaType: a.mediaType,
          preview: a.preview
            ? { url: a.preview.url, mediaType: a.preview.mediaType }
            : undefined,
        })),
        timestamp: new Date(m.createdAt),
        type: "text",
        isMe: m.from === selfHandle(),
        avatar: m.from === selfHandle() ? undefined : room.avatar,
      };
    });
    setMessages(
      msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    );
    setChatRooms((prev) =>
      prev.map((r) => r.id === room.id ? { ...r, unreadCount: 0 } : r)
    );
  };

  const sendMessage = async () => {
    const user = account();
    const room = chatRooms().find((r) => r.id === selectedRoom());
    if (!user || !room) return;
    let content = newMessage();
    if (mediaFile()) {
      const url = await uploadFile({
        content: await mediaFile()!.arrayBuffer(),
        mediaType: mediaFile()!.type,
        name: mediaFile()!.name,
      });
      if (url) {
        const note = {
          content: newMessage(),
          attachment: [{ url, mediaType: mediaFile()!.type }],
        };
        content = JSON.stringify(note);
      }
    }
    await apiFetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: selfHandle(), to: room.id, content }),
    });
    setNewMessage("");
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handleWsMessage = (msg: unknown) => {
    if (
      typeof msg !== "object" || msg === null ||
      (msg as { type?: unknown }).type !== "dm"
    ) {
      return;
    }
    const payload = (msg as { payload: DMRecord }).payload;
    const roomId = payload.from === selfHandle() ? payload.to : payload.from;
    const room = chatRooms().find((r) => r.id === roomId);
    if (!room) return;
    const parsed = parseActivityPubNote(payload.content);
    const m: ChatMessage = {
      id: payload.id,
      author: payload.from,
      displayName: payload.from === selfHandle()
        ? account()?.displayName || account()?.userName || ""
        : room.displayName || room.id,
      address: payload.from,
      content: parsed.content,
      attachments: parsed.attachments?.map((a) => ({
        url: a.url,
        mediaType: a.mediaType,
        preview: a.preview
          ? { url: a.preview.url, mediaType: a.preview.mediaType }
          : undefined,
      })),
      timestamp: new Date(),
      type: "text",
      isMe: payload.from === selfHandle(),
      avatar: payload.from === selfHandle() ? undefined : room.avatar,
    };
    setMessages((prev) => [...prev, m]);
    setChatRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? {
            ...r,
            lastMessage: _parseActivityPubContent(payload.content),
            lastMessageTime: new Date(),
            unreadCount: selectedRoom() === roomId
              ? r.unreadCount
              : r.unreadCount + 1,
          }
          : r
      )
    );
  };

  createEffect(() => {
    const room = chatRooms().find((r) => r.id === selectedRoom());
    if (room) loadMessages(room);
  });

  onMount(async () => {
    await loadRooms();
    if (await isAdsenseEnabled()) {
      await loadAdsenseConfig();
      setShowAds(true);
    }
    addMessageHandler(handleWsMessage);
  });

  onCleanup(() => removeMessageHandler(handleWsMessage));

  return (
    <div class="flex h-full w-full overflow-hidden">
      <ChatRoomList
        rooms={chatRooms()}
        selectedRoom={selectedRoom()}
        onSelect={(id) => setSelectedRoom(id)}
        showAds={showAds()}
        onCreateRoom={() => {}}
        segment={segment()}
        onSegmentChange={(s) => setSegment(s)}
      />
      <div class="flex-1 flex flex-col h-full">
        <Show when={selectedRoom()}>
          <ChatTitleBar
            room={chatRooms().find((r) => r.id === selectedRoom()) ?? null}
            onOpenSettings={() => setShowSettings(true)}
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
          />
        </Show>
        <Show when={!selectedRoom()}>
          <div class="flex-1 flex items-center justify-center text-gray-400">
            ルームを選択してください
          </div>
        </Show>
      </div>
      <ChatSettingsOverlay
        open={showSettings()}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
