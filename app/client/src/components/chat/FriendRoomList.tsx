import { createMemo, createSignal, For, Show } from "solid-js";
import type { Room } from "./types.ts";

interface FriendRoomListProps {
  rooms: Room[];
  friendId: string;
  selectedRoom: string | null;
  onSelectRoom: (roomId: string) => void;
  onBack: () => void;
}

export function FriendRoomList(props: FriendRoomListProps) {
  const [query, setQuery] = createSignal("");

  const friendRooms = createMemo(() =>
    props.rooms.filter(
      (r) => r.members?.includes(props.friendId) || r.id === props.friendId,
    )
  );

  const filteredRooms = createMemo(() => {
    const q = query().toLowerCase().trim();
    const list = friendRooms();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.lastMessage ?? "").toLowerCase().includes(q),
    );
  });

  return (
    <div class="h-full flex flex-col">
      <div class="flex items-center border-b border-[#333] p-3">
        <button
          type="button"
          class="mr-3 rounded p-1 hover:bg-[#3c3c3c]"
          onClick={props.onBack}
        >
          <svg
            class="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 class="flex-1 text-sm text-white">{props.friendId}とのトーク</h2>
      </div>
      <div class="p-3">
        <input
          type="text"
          placeholder="トークを検索..."
          class="w-full rounded-lg border-none bg-[#3c3c3c] p-2 px-3 font-normal text-white outline-none placeholder-[#aaaaaa]"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
      </div>
      <div class="flex-1 overflow-y-auto px-3">
        <Show when={filteredRooms().length === 0}>
          <div class="text-center text-gray-400">トークがありません</div>
        </Show>
        <For each={filteredRooms()}>
          {(room) => (
            <div
              class={`cursor-pointer rounded p-3 ${
                props.selectedRoom === room.id
                  ? "bg-[#4a4a4a]"
                  : "hover:bg-[#3c3c3c]"
              }`}
              onClick={() => props.onSelectRoom(room.id)}
            >
              <div class="text-sm text-white">{room.name || room.id}</div>
              <div class="truncate text-xs text-gray-400">
                {room.lastMessage || "メッセージがありません"}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
