import { createMemo, createSignal, For, Show } from "solid-js";
import type { Room } from "./types.ts";

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface FriendListProps {
  rooms: Room[];
  onSelectFriend: (friendId: string) => void;
  selectedFriend?: string | null;
  query?: string;
  onQueryChange?: (v: string) => void;
  showSearch?: boolean;
}

export function FriendList(props: FriendListProps) {
  const [localQuery, setLocalQuery] = createSignal("");
  const q = () => (props.query !== undefined ? props.query : localQuery());
  const setQuery = (v: string) =>
    props.onQueryChange ? props.onQueryChange(v) : setLocalQuery(v);

  const friends = createMemo(() => {
    const map = new Map<string, Friend>();
    for (const room of props.rooms) {
      const id = room.members?.[0];
      if (!id || map.has(id)) continue;
      map.set(id, { id, name: room.name || id, avatar: room.avatar });
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || a.id).localeCompare(b.name || b.id)
    );
  });

  const filteredFriends = createMemo(() => {
    const qq = q().toLowerCase().trim();
    if (!qq) return friends();
    return friends().filter(
      (f) =>
        f.name.toLowerCase().includes(qq) || f.id.toLowerCase().includes(qq),
    );
  });

  return (
    <div class="h-full flex flex-col">
      <Show when={props.showSearch !== false}>
        <div class="p-3 border-b border-[#333]">
          <input
            type="text"
            placeholder="友だちを検索..."
            class="w-full outline-none border-none font-normal p-2 px-3 rounded-lg bg-[#3c3c3c] text-white placeholder-[#aaaaaa]"
            value={q()}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
        </div>
      </Show>
      <div class="flex-1 overflow-y-auto p-3">
        <Show when={filteredFriends().length === 0}>
          <div class="text-center text-gray-400">友だちが見つかりません</div>
        </Show>
        <For each={filteredFriends()}>
          {(f) => (
            <div
              class={`flex items-center cursor-pointer p-2 rounded ${
                props.selectedFriend === f.id
                  ? "bg-[#4a4a4a]"
                  : "hover:bg-[#3c3c3c]"
              }`}
              onClick={() => props.onSelectFriend(f.id)}
            >
              {f.avatar
                ? <img src={f.avatar} alt="" class="w-8 h-8 rounded-full" />
                : (
                  <div class="w-8 h-8 rounded-full bg-[#444] flex items-center justify-center text-white">
                    {f.name.charAt(0).toUpperCase()}
                  </div>
                )}
              <span class="ml-3 text-sm text-white">{f.name}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
