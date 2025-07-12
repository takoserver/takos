import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchUserProfile } from "./microblog/api.ts";
import { fetchActivityPubObjects } from "./microblog/api.ts";
import { PostList } from "./microblog/Post.tsx";
import { UserAvatar } from "./microblog/UserAvatar.tsx";

export default function UserProfile() {
  const params = useParams();
  const [profile] = createResource(() => fetchUserProfile(params.username));
  const [posts] = createResource(() =>
    fetchActivityPubObjects(params.username, "Note")
  );

  const noop = () => {};
  const formatDate = (d: string) => new Date(d).toLocaleString("ja-JP");

  return (
    <div class="max-w-2xl mx-auto p-4 space-y-6">
      <Show when={profile()}>
        {(info) => (
          <div class="flex items-center space-x-4">
            <UserAvatar
              avatarUrl={info.avatarInitial}
              username={info.userName}
              size="w-16 h-16"
            />
            <div>
              <div class="text-lg font-bold text-white">{info.displayName}</div>
              <div class="text-sm text-gray-400">@{info.userName}</div>
            </div>
          </div>
        )}
      </Show>
      <Show when={posts()}>
        {(list) => (
          <PostList
            posts={list}
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
      </Show>
    </div>
  );
}
