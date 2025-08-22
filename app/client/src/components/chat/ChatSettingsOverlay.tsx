import { Show } from "solid-js";
import type { Room } from "./types.ts";

interface ChatSettingsOverlayProps {
  isOpen: boolean;
  room: Room | null;
  onClose: () => void;
  onRoomUpdated?: (partial: Partial<Room>) => void;
}

export function ChatSettingsOverlay(props: ChatSettingsOverlayProps) {
  return (
    <Show when={props.isOpen && props.room}>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-[#2a2a2a] text-white p-4 rounded w-80">
          <h2 class="text-lg mb-4">チャット設定</h2>
          <p class="mb-4">
            {props.room?.displayName || props.room?.name}
          </p>
          <div class="flex justify-end">
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              onClick={props.onClose}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
