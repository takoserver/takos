import { createResource, For, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { fetchActivityPubObjects, fetchUserProfile } from "./microblog/api.ts";
import { PostList } from "./microblog/Post.tsx";
import { UserAvatar } from "./microblog/UserAvatar.tsx";
import {
  accounts as accountsAtom,
  activeAccount,
  activeAccountId,
} from "../states/account.ts";
import { profileUserState } from "../states/router.ts";
import { getDomain } from "../utils/config.ts";

export default function Profile() {
  const [username, setUsername] = useAtom(profileUserState);
  const [account] = useAtom(activeAccount);
  const [accounts] = useAtom(accountsAtom);
  const [activeId, setActiveId] = useAtom(activeAccountId);

  const isOwnProfile = () =>
    account() && `${account()!.userName}@${getDomain()}` === username();

  const [info] = createResource(
    () => username(),
    (name) => (name ? fetchUserProfile(name) : null),
  );
  const [posts] = createResource(
    () => username(),
    async (name) => {
      if (!name) return [];
      const localName = name.includes("@") ? name.split("@")[0] : name;
      const objs = await fetchActivityPubObjects(localName, "Note");
      const displayName = info()?.displayName || name;
      const avatar = info()?.avatarInitial || "";
      return objs.map((o) => ({
        id: o.id,
        content: o.content ?? "",
        userName: name,
        displayName,
        authorAvatar: avatar,
        createdAt: o.published,
        likes: typeof (o.extra as Record<string, unknown>)?.likes === "number"
          ? (o.extra as Record<string, unknown>)?.likes as number
          : 0,
        retweets:
          typeof (o.extra as Record<string, unknown>)?.retweets === "number"
            ? (o.extra as Record<string, unknown>)?.retweets as number
            : 0,
        replies:
          typeof (o.extra as Record<string, unknown>)?.replies === "number"
            ? (o.extra as Record<string, unknown>)?.replies as number
            : 0,
      }));
    },
  );

  const formatDate = (d: string) => new Date(d).toLocaleString("ja-JP");

  const handleSwitch = (id: string) => {
    setActiveId(id);
    const acc = accounts().find((a) => a.id === id);
    if (acc) setUsername(`${acc.userName}@${getDomain()}`);
  };

  return (
    <div class="min-h-screen text-white">
      <div>
        <Show
          when={!info.loading}
          fallback={<div class="p-4">Loading...</div>}
        >
          <Show
            when={info()}
            fallback={<div class="p-4">ユーザーが見つかりません</div>}
          >
            {(info) => (
              <>
                <div class="relative">
                  <div class="h-48 md:h-64 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
                  <div class="absolute -bottom-16 max-w-4xl mx-auto left-0 right-0 px-4 md:px-8">
                    <UserAvatar
                      avatarUrl={info()?.avatarInitial}
                      username={info()?.userName}
                      size="w-32 h-32"
                      className="border-4 border-black"
                    />
                  </div>
                </div>
                <div class="max-w-4xl mx-auto px-4 md:px-8 pt-20 pb-8">
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-2xl font-bold">{info()?.displayName}</h2>
                      <p class="text-gray-400">
                        {info()?.userName}@{info()?.domain}
                      </p>
                    </div>
                    <Show when={isOwnProfile()}>
                      <select
                        value={activeId() || ""}
                        onChange={(e) => handleSwitch(e.currentTarget.value)}
                        class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      >
                        <For each={accounts()}>
                          {(a) => <option value={a.id}>{a.displayName}</option>}
                        </For>
                      </select>
                    </Show>
                  </div>
                  <div class="flex space-x-6 mt-4 text-gray-400 text-sm">
                    <span>投稿 {info()?.postCount ?? 0}</span>
                    <span>フォロー中 {info()?.followingCount ?? 0}</span>
                    <span>フォロワー {info()?.followersCount ?? 0}</span>
                  </div>
                </div>
                <div class="mt-8 px-4">
                  <PostList
                    posts={posts() || []}
                    tab="latest"
                    handleReply={() => {}}
                    handleRetweet={() => {}}
                    handleQuote={() => {}}
                    handleLike={() => {}}
                    handleEdit={() => {}}
                    handleDelete={() => {}}
                    formatDate={formatDate}
                  />
                </div>
              </>
            )}
          </Show>
        </Show>
      </div>
    </div>
  );
}
