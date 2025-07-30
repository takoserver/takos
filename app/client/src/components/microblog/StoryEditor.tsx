import { createSignal, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { activeAccount } from "../../states/account.ts";
import { createStory } from "./api.ts";
import { Stage } from "./Stage.tsx";
import type {
  ImageItem,
  Story,
  StoryItem,
  StoryPage,
  TextItem,
  VideoItem,
} from "./types.ts";

export function StoryEditor(
  props: { onClose: () => void; onCreated: () => void },
) {
  const [account] = useAtom(activeAccount);
  const [aspectRatio, _setAspectRatio] = createSignal("9:16");
  const [pages, setPages] = createSignal<StoryPage[]>([{
    type: "story:Page",
    items: [],
  }]);
  const [pageIndex, setPageIndex] = createSignal(0);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);

  const currentPage = () => pages()[pageIndex()];

  const updateItem = (idx: number, item: StoryItem) => {
    setPages(
      pages().map((p, i) =>
        i === pageIndex()
          ? { ...p, items: p.items.map((it, j) => j === idx ? item : it) }
          : p
      ),
    );
  };

  const addTextItem = () => {
    const item: TextItem = {
      type: "story:TextItem",
      text: "テキスト",
      bbox: { x: 0.1, y: 0.1, w: 0.3, h: 0.1, units: "fraction" },
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex() ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const addImageItem = () => {
    const item: ImageItem = {
      type: "story:ImageItem",
      media: { type: "Link", href: "" },
      bbox: { x: 0.2, y: 0.2, w: 0.6, h: 0.6, units: "fraction" },
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex() ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const addVideoItem = () => {
    const item: VideoItem = {
      type: "story:VideoItem",
      media: { type: "Link", href: "" },
      bbox: { x: 0.2, y: 0.2, w: 0.6, h: 0.6, units: "fraction" },
      autoplay: true,
      loop: true,
      muted: true,
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex() ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const removeSelected = () => {
    const idx = selectedIndex();
    if (idx === null) return;
    setPages(
      pages().map((p, i) =>
        i === pageIndex()
          ? { ...p, items: p.items.filter((_, j) => j !== idx) }
          : p
      ),
    );
    setSelectedIndex(null);
  };

  const addPage = () =>
    setPages([...pages(), { type: "story:Page", items: [] }]);
  const removePage = () => {
    if (pages().length <= 1) return;
    const idx = pageIndex();
    setPages(pages().filter((_, i) => i !== idx));
    setPageIndex(Math.max(0, idx - 1));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const user = account();
    if (!user) {
      alert("アカウントが選択されていません");
      return;
    }
    const story: Story = {
      id: "",
      author: user.userName,
      aspectRatio: aspectRatio(),
      pages: pages(),
      createdAt: new Date().toISOString(),
      views: 0,
    };
    const ok = await createStory(story);
    if (ok) {
      props.onCreated();
      props.onClose();
    } else {
      alert("ストーリーの作成に失敗しました");
    }
  };

  const selectedItem = () => {
    const idx = selectedIndex();
    return idx === null ? null : currentPage().items[idx];
  };

  const updateSelected = (item: StoryItem) => {
    const idx = selectedIndex();
    if (idx !== null) updateItem(idx, item);
  };

  return (
    <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <form
        class="bg-gray-900 p-4 rounded w-full max-w-xl space-y-4"
        onSubmit={handleSubmit}
      >
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-bold">ストーリー編集</h2>
          <button type="button" onClick={props.onClose} class="text-gray-400">
            ×
          </button>
        </div>
        <div class="flex space-x-2">
          <button
            type="button"
            onClick={() => setPageIndex(Math.max(0, pageIndex() - 1))}
          >
            前
          </button>
          <span>{pageIndex() + 1} / {pages().length}</span>
          <button
            type="button"
            onClick={() =>
              setPageIndex(Math.min(pages().length - 1, pageIndex() + 1))}
          >
            次
          </button>
          <button type="button" onClick={addPage}>ページ追加</button>
          <button type="button" onClick={removePage}>ページ削除</button>
        </div>
        <Stage
          page={currentPage()}
          width={300}
          height={500}
          selectedIndex={selectedIndex()}
          onSelect={setSelectedIndex}
          updateItem={updateItem}
        />
        <div class="flex space-x-2">
          <button
            type="button"
            onClick={addTextItem}
            class="px-2 py-1 bg-blue-600 rounded"
          >
            テキスト
          </button>
          <button
            type="button"
            onClick={addImageItem}
            class="px-2 py-1 bg-blue-600 rounded"
          >
            画像
          </button>
          <button
            type="button"
            onClick={addVideoItem}
            class="px-2 py-1 bg-blue-600 rounded"
          >
            動画
          </button>
          <button
            type="button"
            onClick={removeSelected}
            class="px-2 py-1 bg-red-600 rounded"
          >
            選択削除
          </button>
        </div>
        <Show when={selectedItem()}>
          {(item) => (
            <div class="space-y-2 border p-2 rounded">
              <label class="block text-sm">
                x
                <input
                  type="number"
                  step="0.01"
                  value={item().bbox.x}
                  onInput={(e) =>
                    updateSelected({
                      ...item(),
                      bbox: {
                        ...item().bbox,
                        x: Number(e.currentTarget.value),
                      },
                    })}
                  class="w-20 bg-gray-800"
                />
              </label>
              <label class="block text-sm">
                y
                <input
                  type="number"
                  step="0.01"
                  value={item().bbox.y}
                  onInput={(e) =>
                    updateSelected({
                      ...item(),
                      bbox: {
                        ...item().bbox,
                        y: Number(e.currentTarget.value),
                      },
                    })}
                  class="w-20 bg-gray-800"
                />
              </label>
              <label class="block text-sm">
                w
                <input
                  type="number"
                  step="0.01"
                  value={item().bbox.w}
                  onInput={(e) =>
                    updateSelected({
                      ...item(),
                      bbox: {
                        ...item().bbox,
                        w: Number(e.currentTarget.value),
                      },
                    })}
                  class="w-20 bg-gray-800"
                />
              </label>
              <label class="block text-sm">
                h
                <input
                  type="number"
                  step="0.01"
                  value={item().bbox.h}
                  onInput={(e) =>
                    updateSelected({
                      ...item(),
                      bbox: {
                        ...item().bbox,
                        h: Number(e.currentTarget.value),
                      },
                    })}
                  class="w-20 bg-gray-800"
                />
              </label>
              <label class="block text-sm">
                rotation
                <input
                  type="number"
                  step="1"
                  value={item().rotation ?? 0}
                  onInput={(e) =>
                    updateSelected({
                      ...item(),
                      rotation: Number(e.currentTarget.value),
                    })}
                  class="w-20 bg-gray-800"
                />
              </label>
              <Show when={item().type === "story:TextItem"}>
                {(v) => (
                  <input
                    type="text"
                    value={(v() as TextItem).text}
                    onInput={(e) =>
                      updateSelected({
                        ...(v() as TextItem),
                        text: e.currentTarget.value,
                      })}
                    class="w-full bg-gray-800"
                  />
                )}
              </Show>
              <Show when={item().type !== "story:TextItem"}>
                {(v) => (
                  <input
                    type="url"
                    value={(v() as ImageItem | VideoItem).media.href}
                    onInput={(e) =>
                      updateSelected({
                        ...(v() as ImageItem),
                        media: {
                          ...(v() as ImageItem).media,
                          href: e.currentTarget.value,
                        },
                      })}
                    class="w-full bg-gray-800"
                  />
                )}
              </Show>
            </div>
          )}
        </Show>
        <div class="text-right">
          <button type="submit" class="px-4 py-2 bg-blue-500 rounded">
            作成
          </button>
        </div>
      </form>
    </div>
  );
}
