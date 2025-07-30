import { createSignal, For } from "solid-js";
import { useAtom } from "solid-jotai";
import type {
  ImageItem,
  Story,
  StoryItem,
  StoryPage,
  TextItem,
  VideoItem,
} from "./types.ts";
import { createStory } from "./api.ts";
import { activeAccount } from "../../states/account.ts";

export function StoryEditor(
  props: { onClose: () => void; onCreated: () => void },
) {
  const [account] = useAtom(activeAccount);
  const [aspectRatio, setAspectRatio] = createSignal("9:16");
  const [pages, setPages] = createSignal<StoryPage[]>([
    { type: "story:Page", items: [] },
  ]);

  const addPage = () => {
    setPages([...pages(), { type: "story:Page", items: [] }]);
  };

  const removePage = (index: number) => {
    setPages(pages().filter((_, i) => i !== index));
  };

  const addTextItem = (pageIndex: number) => {
    const item: TextItem = {
      type: "story:TextItem",
      text: "",
      bbox: { x: 0.1, y: 0.1, w: 0.8, h: 0.2, units: "fraction" },
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const addImageItem = (pageIndex: number) => {
    const item: ImageItem = {
      type: "story:ImageItem",
      media: { type: "Link", href: "" },
      bbox: { x: 0, y: 0, w: 1, h: 1, units: "fraction" },
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const addVideoItem = (pageIndex: number) => {
    const item: VideoItem = {
      type: "story:VideoItem",
      media: { type: "Link", href: "" },
      bbox: { x: 0, y: 0, w: 1, h: 1, units: "fraction" },
      autoplay: true,
      loop: true,
      muted: true,
    };
    setPages(
      pages().map((p, i) =>
        i === pageIndex ? { ...p, items: [...p.items, item] } : p
      ),
    );
  };

  const updateItem = (
    pageIndex: number,
    itemIndex: number,
    item: StoryItem,
  ) => {
    setPages(
      pages().map((p, i) =>
        i === pageIndex
          ? { ...p, items: p.items.map((it, j) => j === itemIndex ? item : it) }
          : p
      ),
    );
  };

  const removeItem = (pageIndex: number, itemIndex: number) => {
    setPages(
      pages().map((p, i) =>
        i === pageIndex
          ? { ...p, items: p.items.filter((_, j) => j !== itemIndex) }
          : p
      ),
    );
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

  const renderItemInputs = (item: StoryItem, pageIdx: number, idx: number) => {
    if (item.type === "story:TextItem") {
      const i = item as TextItem;
      return (
        <div class="space-y-2 border p-2 rounded-md">
          <input
            type="text"
            class="w-full bg-gray-800 p-2 rounded"
            placeholder="テキスト"
            value={i.text}
            onInput={(e) =>
              updateItem(pageIdx, idx, { ...i, text: e.currentTarget.value })}
          />
          <input
            type="number"
            class="w-16 bg-gray-800 p-1 rounded"
            step="0.01"
            value={i.bbox.x}
            onInput={(e) =>
              updateItem(pageIdx, idx, {
                ...i,
                bbox: { ...i.bbox, x: Number(e.currentTarget.value) },
              })}
          />
          <button
            type="button"
            class="ml-2 text-red-400"
            onClick={() => removeItem(pageIdx, idx)}
          >
            削除
          </button>
        </div>
      );
    }
    if (item.type === "story:ImageItem" || item.type === "story:VideoItem") {
      const i = item as ImageItem | VideoItem;
      return (
        <div class="space-y-2 border p-2 rounded-md">
          <input
            type="url"
            class="w-full bg-gray-800 p-2 rounded"
            placeholder="URL"
            value={i.media.href}
            onInput={(e) =>
              updateItem(pageIdx, idx, {
                ...i,
                media: { ...i.media, href: e.currentTarget.value },
              })}
          />
          <button
            type="button"
            class="ml-2 text-red-400"
            onClick={() => removeItem(pageIdx, idx)}
          >
            削除
          </button>
        </div>
      );
    }
  };

  return (
    <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <form
        class="bg-gray-900 p-4 rounded w-full max-w-lg space-y-4 overflow-y-auto max-h-screen"
        onSubmit={handleSubmit}
      >
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-bold">ストーリー編集</h2>
          <button type="button" onClick={props.onClose} class="text-gray-400">
            ×
          </button>
        </div>
        <label class="block text-sm mb-2">
          アスペクト比
          <input
            type="text"
            value={aspectRatio()}
            onInput={(e) => setAspectRatio(e.currentTarget.value)}
            class="w-full bg-gray-800 p-2 rounded"
          />
        </label>
        <For each={pages()}>
          {(page, pageIdx) => (
            <div class="border border-gray-700 p-2 rounded space-y-2">
              <div class="flex items-center justify-between">
                <span>ページ {pageIdx() + 1}</span>
                <button
                  type="button"
                  class="text-red-400"
                  onClick={() => removePage(pageIdx())}
                >
                  削除
                </button>
              </div>
              <For each={page.items}>
                {(item, idx) => (
                  <div>{renderItemInputs(item, pageIdx(), idx())}</div>
                )}
              </For>
              <div class="flex space-x-2">
                <button
                  type="button"
                  onClick={() => addTextItem(pageIdx())}
                  class="px-2 py-1 bg-blue-600 rounded"
                >
                  テキスト追加
                </button>
                <button
                  type="button"
                  onClick={() => addImageItem(pageIdx())}
                  class="px-2 py-1 bg-blue-600 rounded"
                >
                  画像追加
                </button>
                <button
                  type="button"
                  onClick={() => addVideoItem(pageIdx())}
                  class="px-2 py-1 bg-blue-600 rounded"
                >
                  動画追加
                </button>
              </div>
            </div>
          )}
        </For>
        <button
          type="button"
          onClick={addPage}
          class="px-3 py-1 bg-gray-700 rounded"
        >
          ページ追加
        </button>
        <div class="text-right">
          <button type="submit" class="px-4 py-2 bg-blue-500 rounded">
            作成
          </button>
        </div>
      </form>
    </div>
  );
}
