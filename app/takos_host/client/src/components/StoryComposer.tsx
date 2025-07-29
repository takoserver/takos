import { createSignal, Show } from "solid-js";
import { createStory } from "../../../../client/src/components/microblog/api.ts";

export default function StoryComposer(
  props: { username: string; onPosted?: () => void },
) {
  const [open, setOpen] = createSignal(false);
  const [url, setUrl] = createSignal("");

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!url()) return;
    const ok = await createStory(props.username, url());
    if (ok) {
      setUrl("");
      setOpen(false);
      props.onPosted?.();
    } else {
      alert("ストーリーの作成に失敗しました");
    }
  };

  return (
    <>
      <button
        type="button"
        class="px-3 py-1 bg-pink-500 text-white rounded"
        onClick={() => setOpen(true)}
      >
        ストーリー作成
      </button>
      <Show when={open()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form class="bg-gray-900 p-4 rounded space-y-2" onSubmit={submit}>
            <input
              type="url"
              placeholder="画像URL"
              value={url()}
              onInput={(e) => setUrl(e.currentTarget.value)}
              class="w-60 px-2 py-1 bg-gray-800 text-white rounded"
              required
            />
            <div class="text-right space-x-2">
              <button
                type="button"
                class="px-3 py-1"
                onClick={() => setOpen(false)}
              >
                キャンセル
              </button>
              <button
                type="submit"
                class="px-3 py-1 bg-blue-600 rounded text-white"
              >
                投稿
              </button>
            </div>
          </form>
        </div>
      </Show>
    </>
  );
}
