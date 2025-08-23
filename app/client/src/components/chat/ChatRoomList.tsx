import { createSignal } from "solid-js";
import type { Room } from "./types.ts";
import { FriendList } from "./FriendList.tsx";

interface ChatRoomListProps {
  rooms: Room[];
  selectedRoom: string | null;
  onSelect: (id: string) => void;
}

export function ChatRoomList(props: ChatRoomListProps) {
  const [query, setQuery] = createSignal("");
  return (
    <div class="hidden h-full w-64 flex-col border-r border-[#333] md:flex">
      <FriendList
        rooms={props.rooms}
        selectedFriend={props.selectedRoom}
        query={query()}
        onQueryChange={setQuery}
        onSelectFriend={props.onSelect}
      />
    </div>
  );
}
