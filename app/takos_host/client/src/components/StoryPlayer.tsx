import { createSignal, onCleanup } from "solid-js";

export default function StoryPlayer() {
  const [open, setOpen] = createSignal(false);
  const [story, setStory] = createSignal<unknown>(null);
  const handler = (e: CustomEvent<unknown>) => {
    setStory(e.detail);
    setOpen(true);
  };
  globalThis.addEventListener("open-story", handler as EventListener);
  onCleanup(() =>
    globalThis.removeEventListener("open-story", handler as EventListener)
  );

  const _next = () => {/* 次フレームへ */};

  return open() && story()
    ? (
      <div class="fixed inset-0 bg-black/80 flex items-center justify-center">
        <div class="w-[360px] h-[640px] bg-black relative">
          {/* 最小: 画像/動画のみ表示（オーバレイ描画は後述） */}
          {/* TODO: overlays を canvas/SVG で描画 */}
          <img
            src={story().items[0].media.url}
            class="w-full h-full object-cover"
          />
          <button
            type="button"
            class="absolute top-2 right-2 text-white"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
      </div>
    )
    : null;
}
