import { createResource, For, Show } from "solid-js";

async function fetchStories(url: string) {
  const res = await fetch(url, {
    headers: { accept: "application/activity+json" },
  });
  if (!res.ok) return { orderedItems: [] } as unknown;
  return await res.json();
}

export default function StoryReel(props: { actorUrl: string }) {
  const storiesUrl = `${props.actorUrl}/stories`;
  const [data] = createResource(() => storiesUrl, fetchStories);

  return (
    <div class="flex gap-3 overflow-x-auto py-2">
      <Show
        when={data()?.orderedItems?.length}
        fallback={<div class="text-sm text-zinc-500">No stories</div>}
      >
        <For each={data()!.orderedItems}>
          {(story: unknown) => (
            <button
              type="button"
              class="relative w-16 h-16 rounded-full ring-2 ring-pink-400 overflow-hidden"
              onClick={() =>
                globalThis.dispatchEvent(
                  new CustomEvent("open-story", { detail: story }),
                )}
            >
              <img
                src={story.fallback?.url ?? story.items?.[0]?.media?.url}
                alt=""
                class="w-full h-full object-cover"
              />
            </button>
          )}
        </For>
      </Show>
    </div>
  );
}
