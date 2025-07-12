import { createResource, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import {
  fetchActivityPubObjects,
  fetchUserProfile,
} from "../components/microblog/api.ts";
import { renderNoteContent } from "../utils/render.ts";

export default function UserProfilePage() {
  const params = useParams();
  const [profile] = createResource(() => fetchUserProfile(params.username));
  const [posts] = createResource(() =>
    fetchActivityPubObjects(params.username, "Note")
  );
  return (
    <div class="p-4 text-gray-100 space-y-4">
      <Show when={profile()}>
        {(p) => (
          <div class="border-b border-gray-700 pb-4">
            <h2 class="text-xl font-bold">{p.displayName}</h2>
            <p class="text-gray-400">@{p.userName}</p>
          </div>
        )}
      </Show>
      <For each={posts() || []}>
        {(post) => (
          <div class="border-b border-gray-700 pb-3 mb-3">
            <div innerHTML={renderNoteContent({ content: post.content })} />
          </div>
        )}
      </For>
    </div>
  );
}
