import { createEffect, createSignal, For, onCleanup } from "solid-js";
import type { ImageItem, Story, TextItem, VideoItem } from "./types.ts";
import { UserAvatar } from "./UserAvatar.tsx";
import { getDomain } from "../../utils/config.ts";
import { StoryEditor } from "./StoryEditor.tsx";

export function StoryTray(props: {
  stories: Story[];
  refetchStories: () => void;
  handleViewStory: (story: Story, index: number) => void;
}) {
  const [showEditor, setShowEditor] = createSignal(false);

  return (
    <>
      <div class="border-b border-gray-800 py-4 px-4">
        <div class="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
          {/* ストーリー作成ボタン */}
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            class="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer"
          >
            <div class="w-16 h-16 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center hover:border-blue-400 transition-colors">
              <svg
                class="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <span class="text-xs text-gray-400">ストーリー</span>
          </button>

          {/* ストーリー一覧 */}
          <For each={props.stories}>
            {(story, index) => (
              <button
                type="button"
                onClick={() => props.handleViewStory(story, index())}
                class="flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer group"
              >
                <div
                  class={`w-16 h-16 rounded-full p-0.5 ${
                    story.isViewed
                      ? "bg-gray-600"
                      : "bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500"
                  }`}
                >
                  <div class="w-full h-full bg-black rounded-full flex items-center justify-center overflow-hidden">
                    {story.poster?.href
                      ? (
                        <img
                          src={story.poster.href}
                          alt=""
                          class="w-full h-full object-cover rounded-full"
                        />
                      )
                      : (
                        <div class="w-full h-full rounded-full overflow-hidden">
                          <a
                            href={`#/user/${
                              encodeURIComponent(
                                story.author.includes("@")
                                  ? story.author
                                  : `${story.author}@${getDomain()}`,
                              )
                            }`}
                            class="block"
                          >
                            <UserAvatar
                              username={story.author}
                              size="w-full h-full"
                              className="border-0"
                            />
                          </a>
                        </div>
                      )}
                  </div>
                </div>
                <a
                  href={`#/user/${
                    encodeURIComponent(
                      story.author.includes("@")
                        ? story.author
                        : `${story.author}@${getDomain()}`,
                    )
                  }`}
                  class="text-xs text-gray-400 group-hover:text-white transition-colors max-w-16 truncate"
                >
                  {story.author}
                </a>
              </button>
            )}
          </For>
        </div>
      </div>

      {showEditor() && (
        <StoryEditor
          onClose={() => setShowEditor(false)}
          onCreated={() => props.refetchStories()}
        />
      )}
    </>
  );
}
export function StoryViewer(props: {
  showStoryViewer: boolean;
  selectedStory: Story | null;
  stories: Story[];
  currentStoryIndex: number;
  previousStory: () => void;
  nextStory: () => void;
  closeStoryViewer: () => void;
  handleDeleteStory: (id: string) => void;
  formatDate: (dateString: string) => string;
}) {
  const [time, setTime] = createSignal(0);
  let frame = 0;

  createEffect(() => {
    props.selectedStory;
    setTime(0);
  });

  createEffect(() => {
    cancelAnimationFrame(frame);
    const loop = (_ts: number) => {
      setTime((t) => t + 0.016);
      frame = requestAnimationFrame(loop);
    };
    if (props.showStoryViewer) frame = requestAnimationFrame(loop);
    onCleanup(() => cancelAnimationFrame(frame));
  });

  createEffect(() => {
    const max = Math.max(
      5,
      props.selectedStory?.item.visibleUntil ?? 5,
    );
    if (time() > max) props.nextStory();
  });

  const renderItem = (item: ImageItem | VideoItem | TextItem) => {
    const t = time();
    if (item.visibleFrom !== undefined && t < item.visibleFrom) return null;
    if (item.visibleUntil !== undefined && t > item.visibleUntil) return null;
    const style = `left:${item.bbox.x * 100}%;top:${item.bbox.y * 100}%;width:${
      item.bbox.w * 100
    }%;height:${item.bbox.h * 100}%;`;
    switch (item.type) {
      case "story:ImageItem":
        return (
          <img
            src={item.media.href}
            style={style}
            class="absolute object-cover"
            alt={item.alt || item.accessibilityLabel || ""}
          />
        );
      case "story:VideoItem":
        return (
          <video
            src={item.media.href}
            style={style}
            class="absolute object-cover"
            muted
            autoplay
            loop
          />
        );
      case "story:TextItem":
        return <div style={style} class="absolute" innerText={item.text} />;
    }
  };

  return (
    <>
      {props.showStoryViewer && props.selectedStory && (
        <div class="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div class="relative w-full max-w-sm h-full">
            <div class="w-full h-full relative bg-black">
              {renderItem(props.selectedStory.item)}
            </div>

            <button
              type="button"
              onClick={props.closeStoryViewer}
              class="absolute top-4 right-4 z-20 text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>

            {props.selectedStory.author === "user" && (
              <button
                type="button"
                onClick={() => props.handleDeleteStory(props.selectedStory.id)}
                class="absolute bottom-4 right-4 z-20 text-white p-2 rounded-full bg-red-500/50 hover:bg-red-500/70 transition-colors"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
