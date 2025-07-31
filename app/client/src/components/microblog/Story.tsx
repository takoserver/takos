import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import type { Story } from "./types.ts";
import { createStory } from "./api.ts";
import { UserAvatar } from "./UserAvatar.tsx";
import { getDomain } from "../../utils/config.ts";
import StoryEditor from "../story-editor/StoryEditor.tsx";
import { toActivityStreams } from "../story-editor/toActivityStreams.ts";
import type { StoryCanvasState } from "../story-editor/state.ts";

export function StoryTray(props: {
  stories: Story[];
  refetchStories: () => void;
  handleViewStory: (story: Story, index: number) => void;
}) {
  const [showEditor, setShowEditor] = createSignal(false);
  const [editorMediaUrl, setEditorMediaUrl] = createSignal("");
  let fileInputRef: HTMLInputElement | undefined;

  const handleCreateStory = () => {
    fileInputRef?.click();
  };

  const handleFileChange = (e: Event) => {
    const files = (e.currentTarget as HTMLInputElement).files;
    if (files && files[0]) {
      const url = URL.createObjectURL(files[0]);
      setEditorMediaUrl(url);
      setShowEditor(true);
    }
  };

  const handleEditorSubmit = async (
    state: StoryCanvasState,
    blobUrl: string,
  ) => {
    const activity = toActivityStreams(state, blobUrl);
    const success = await createStory(activity);
    if (success) {
      setShowEditor(false);
      props.refetchStories();
    } else {
      alert("ストーリーの作成に失敗しました");
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*,video/*"
        class="hidden"
        ref={(el) => (fileInputRef = el ?? undefined)}
        onChange={handleFileChange}
      />
      <div class="border-b border-gray-800 py-4 px-4">
        <div class="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
          {/* ストーリー作成ボタン */}
          <button
            type="button"
            onClick={handleCreateStory}
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
                    {story.mediaUrl
                      ? (
                        <img
                          src={story.mediaUrl}
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

      <Show when={showEditor()}>
        <StoryEditor
          mediaUrl={editorMediaUrl()}
          onCancel={() => setShowEditor(false)}
          onSubmit={handleEditorSubmit}
        />
      </Show>
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
  const [progress, setProgress] = createSignal(0);
  let videoRef: HTMLVideoElement | undefined;

  createEffect(() => {
    if (!props.showStoryViewer || !props.selectedStory) return;
    setProgress(0);
    if (props.selectedStory.mediaType?.startsWith("video")) {
      if (videoRef) {
        videoRef.currentTime = 0;
        videoRef.play().catch(() => {});
        const timeHandler = () => {
          if (videoRef && videoRef.duration) {
            setProgress(videoRef.currentTime / videoRef.duration);
          }
        };
        const endHandler = () => {
          props.nextStory();
        };
        videoRef.addEventListener("timeupdate", timeHandler);
        videoRef.addEventListener("ended", endHandler);
        onCleanup(() => {
          videoRef?.removeEventListener("timeupdate", timeHandler);
          videoRef?.removeEventListener("ended", endHandler);
        });
      }
    } else {
      let raf = 0;
      const start = performance.now();
      const duration = 5000;
      const tick = (now: number) => {
        const ratio = (now - start) / duration;
        setProgress(ratio);
        if (ratio >= 1) {
          props.nextStory();
        } else {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
      onCleanup(() => cancelAnimationFrame(raf));
    }
  });

  return (
    <>
      {props.showStoryViewer && props.selectedStory && (
        <div class="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div class="relative w-full max-w-sm h-full">
            {/* 進行状況バー */}
            <div class="absolute top-4 left-4 right-4 z-20 flex space-x-1">
              <For each={props.stories}>
                {(_, index) => (
                  <div class="flex-1 h-1 bg-gray-600 rounded">
                    <div
                      class="h-full bg-white rounded transition-all duration-300"
                      style={`width: ${
                        index() < props.currentStoryIndex
                          ? "100%"
                          : index() === props.currentStoryIndex
                          ? `${Math.min(progress() * 100, 100)}%`
                          : "0%"
                      }`}
                    />
                  </div>
                )}
              </For>
            </div>

            {/* ストーリーコンテンツ */}
            <div class="w-full h-full relative">
              {props.selectedStory!.mediaUrl &&
                (props.selectedStory!.mediaType?.startsWith("video")
                  ? (
                    <video
                      ref={(v) => (videoRef = v ?? undefined)}
                      src={props.selectedStory!.mediaUrl}
                      class="w-full h-full object-cover"
                      playsInline
                      muted
                      autoplay
                    />
                  )
                  : (
                    <img
                      src={props.selectedStory!.mediaUrl}
                      alt=""
                      class="w-full h-full object-cover"
                    />
                  ))}
              <div
                class="absolute inset-0 flex flex-col justify-end p-6"
                style={!props.selectedStory!.mediaUrl
                  ? `background-color: ${
                    props.selectedStory!.backgroundColor
                  };` +
                    `color: ${props.selectedStory!.textColor};`
                  : "background: linear-gradient(transparent, rgba(0,0,0,0.7))"}
              >
                <div class="text-white">
                  <div class="flex items-center space-x-2 mb-2">
                    <span class="font-bold text-lg">
                      {props.selectedStory!.author}
                    </span>
                    <span class="text-sm opacity-75">
                      {props.formatDate(props.selectedStory!.createdAt)}
                    </span>
                  </div>
                  <div class="text-lg leading-relaxed">
                    {props.selectedStory!.content}
                  </div>
                </div>
              </div>
            </div>

            {/* ナビゲーションエリア */}
            <div class="absolute inset-0 flex">
              <button
                type="button"
                onClick={props.previousStory}
                class="flex-1 opacity-0 hover:opacity-10 bg-black transition-opacity"
              />
              <button
                type="button"
                onClick={props.nextStory}
                class="flex-1 opacity-0 hover:opacity-10 bg-black transition-opacity"
              />
            </div>

            {/* 閉じるボタン */}
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

            {/* 削除ボタン（自分のストーリーの場合） */}
            {props.selectedStory!.author === "user" && (
              <button
                type="button"
                onClick={() => props.handleDeleteStory(props.selectedStory!.id)}
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
