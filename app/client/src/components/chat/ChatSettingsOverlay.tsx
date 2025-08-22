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
        <div class="bg-white rounded p-4 w-72 text-black">
          <h2 class="text-lg font-bold mb-2">チャット設定</h2>
          <p class="mb-4">現在、設定項目はありません。</p>
          <button
            type="button"
            class="px-4 py-2 rounded bg-gray-700 text-white"
            onClick={props.onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </Show>
  );
}
