import { createSignal, Show } from "solid-js";
import type { Room } from "./types.ts";
import { FriendList } from "./FriendList.tsx";
import SwipeTabs from "../ui/SwipeTabs.tsx";

interface ChatRoomListProps {
  rooms: Room[];
  selectedFriend: string | null;
  onSelect: (id: string) => void;
  showAds: boolean;
  onCreateRoom: () => void;
  segment: "all" | "people" | "groups";
  onSegmentChange: (seg: "all" | "people" | "groups") => void;
}

export function ChatRoomList(props: ChatRoomListProps) {
  const [query, setQuery] = createSignal("");
  // 未実装のため現在は使用しない
  void props.showAds;
  void props.onCreateRoom;

  return (
    <div class="h-full flex flex-col">
      <SwipeTabs
        value={props.segment}
        onChange={props.onSegmentChange}
        tabs={[
          { value: "all", label: "すべて" },
          { value: "people", label: "友だち" },
          { value: "groups", label: "グループ" },
        ]}
      />
      <Show when={props.segment !== "groups"}>
        <FriendList
          rooms={props.rooms}
          onSelectFriend={props.onSelect}
          selectedFriend={props.selectedFriend ?? undefined}
          query={query()}
          onQueryChange={setQuery}
          showSearch
        />
      </Show>
      <Show when={props.segment === "groups"}>
        <div class="p-4 text-center text-gray-400">
          グループ機能は未実装です
        </div>
      </Show>
    </div>
  );
}
