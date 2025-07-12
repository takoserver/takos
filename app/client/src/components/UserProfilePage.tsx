import { createResource, For, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchUserPosts, fetchUserProfile } from "./microblog/api.ts";
import { PostItem } from "./microblog/Post.tsx";

export default function UserProfilePage() {
  const params = useParams();
  const [info] = createResource(() => fetchUserProfile(params.username));
  const [posts] = createResource(() => fetchUserPosts(params.username));
  const formatDate = (d: string) => new Date(d).toLocaleString();
  const noop = () => {};
  return (
    <div class="p-4">
      <Show when={info()}>
        {(u) => (
          <div class="mb-6">
            <h2 class="text-xl font-bold">{u.displayName}</h2>
            <p class="text-gray-400">@{u.userName}</p>
          </div>
        )}
      </Show>
      <For each={posts()}>
        {(p) => (
          <PostItem
            post={p}
            tab="recommend"
            handleReply={noop}
            handleRetweet={noop}
            handleQuote={noop}
            handleLike={noop}
            handleEdit={noop}
            handleDelete={noop}
            formatDate={formatDate}
          />
        )}
      </For>
    </div>
  );
}
