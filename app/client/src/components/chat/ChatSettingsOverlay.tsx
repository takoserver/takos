import { Show } from "solid-js";
import type { Room } from "./types.ts";

interface ChatSettingsOverlayProps {
  isOpen: boolean;
  room: Room | null;
  onClose: () => void;
}

export function ChatSettingsOverlay(props: ChatSettingsOverlayProps) {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="w-80 rounded bg-[#222] p-4 shadow-lg">
          <h2 class="mb-4 text-lg text-white">チャット設定</h2>
          <p class="mb-4 text-sm text-gray-300">
            {props.room?.name ?? "選択中のチャット"}
          </p>
          <div class="text-right">
            <button
              type="button"
              class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
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
