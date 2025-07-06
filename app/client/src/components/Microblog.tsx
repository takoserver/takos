import { createResource, createSignal } from "solid-js";
import { useAtom } from "solid-jotai";
import { activeAccount } from "../states/account.ts";
import { CommunityView } from "./microblog/Community.tsx";
import { StoryTray, StoryViewer } from "./microblog/Story.tsx";
import { PostForm, PostList } from "./microblog/Post.tsx";
import {
  _replyToPost,
  createPost,
  deletePost,
  deleteStory,
  fetchCommunities,
  fetchFollowingPosts,
  fetchPosts,
  fetchStories,
  likePost,
  retweetPost,
  updatePost,
  viewStory,
} from "./microblog/api.ts";
import type { Community, MicroblogPost, Story } from "./microblog/types.ts";

export function Microblog() {
  // タブ切り替え: "recommend" | "following" | "community"
  const [account] = useAtom(activeAccount);
  const [tab, setTab] = createSignal<"recommend" | "following" | "community">(
    "recommend",
  );
  const [newPostContent, setNewPostContent] = createSignal("");
  const [showPostForm, setShowPostForm] = createSignal(false);
  const [_replyingTo, _setReplyingTo] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [posts, { mutate, refetch }] = createResource(fetchPosts);
  // フォロー中投稿の取得
  const [followingTimelinePosts, { refetch: _refetchFollowing }] =
    createResource(() => {
      const user = account();
      return user ? fetchFollowingPosts(user.userName) : Promise.resolve([]);
    });
  // コミュニティデータをAPIから取得
  const [communitiesData, { refetch: _refetchCommunities }] = createResource(
    fetchCommunities,
  );
  // ストーリー
  const [stories, { refetch: refetchStories }] = createResource(fetchStories);
  const [selectedStory, setSelectedStory] = createSignal<Story | null>(null);
  const [showStoryViewer, setShowStoryViewer] = createSignal(false);
  const [currentStoryIndex, setCurrentStoryIndex] = createSignal(0);
  // コミュニティ
  const [showCommunityView, setShowCommunityView] = createSignal(false);
  const [selectedCommunity, setSelectedCommunity] = createSignal<
    Community | null
  >(null);
  const [showCreateCommunity, setShowCreateCommunity] = createSignal(false);
  const [communityName, setCommunityName] = createSignal("");
  const [communityDescription, setCommunityDescription] = createSignal("");
  const [communityAvatar, setCommunityAvatar] = createSignal("");
  const [communityBanner, setCommunityBanner] = createSignal("");
  const [communityTags, setCommunityTags] = createSignal("");
  const [communityIsPrivate, setCommunityIsPrivate] = createSignal(false);
  // コミュニティデータはAPIから取得（communitiesData）
  // コミュニティ投稿は各コミュニティの詳細取得時にAPIから取得する想定
  // フォロー中投稿もAPIから取得（followingTimelinePosts）

  // コミュニティ関連のハンドラー
  const handleJoinCommunity = (communityId: string) => {
    // TODO: API call to join community
    console.log("Joining community:", communityId);
  };

  const handleLeaveCommunity = (communityId: string) => {
    // TODO: API call to leave community
    console.log("Leaving community:", communityId);
  };

  const handleCreateCommunity = (e: Event) => {
    e.preventDefault();
    // TODO: API call to create community
    console.log("Creating community:", {
      name: communityName(),
      description: communityDescription(),
      isPrivate: communityIsPrivate(),
    });
    setShowCreateCommunity(false);
  };

  const handleSelectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    setShowCommunityView(true);
  };

  const handleLikeCommunityPost = (postId: string) => {
    // TODO: API call to like community post
    console.log("Liking community post:", postId);
  };

  // ストーリー関連のハンドラー
  const handleViewStory = async (story: Story, index: number) => {
    await viewStory(story.id);
    setSelectedStory(story);
    setCurrentStoryIndex(index);
    setShowStoryViewer(true);
    refetchStories();
  };

  const nextStory = () => {
    const storiesArray = stories() || [];
    const nextIndex = (currentStoryIndex() + 1) % storiesArray.length;
    setCurrentStoryIndex(nextIndex);
    setSelectedStory(storiesArray[nextIndex]);
  };

  const previousStory = () => {
    const storiesArray = stories() || [];
    const prevIndex = currentStoryIndex() === 0
      ? storiesArray.length - 1
      : currentStoryIndex() - 1;
    setCurrentStoryIndex(prevIndex);
    setSelectedStory(storiesArray[prevIndex]);
  };

  const closeStoryViewer = () => {
    setShowStoryViewer(false);
    setSelectedStory(null);
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("このストーリーを削除しますか？")) return;
    const success = await deleteStory(id);
    if (success) {
      refetchStories();
      closeStoryViewer();
    } else {
      alert("ストーリーの削除に失敗しました");
    }
  };

  const filteredPosts = () => {
    const query = searchQuery().toLowerCase();
    let postsToFilter: MicroblogPost[] = [];

    // タブに応じて投稿を選択
    if (tab() === "recommend") {
      postsToFilter = posts() || [];
    } else if (tab() === "following") {
      postsToFilter = followingTimelinePosts() || [];
    } else if (tab() === "community") {
      // コミュニティタブの場合は選択中コミュニティの投稿を取得する設計にする
      // ここでは空配列を返す（詳細はCommunityView側で取得・表示）
      postsToFilter = [];
    } else {
      postsToFilter = [];
    }

    if (!query) return postsToFilter;
    return postsToFilter.filter((post) =>
      post.content.toLowerCase().includes(query) ||
      post.userName.toLowerCase().includes(query) ||
      (post.hashtags &&
        post.hashtags.some((tag) => tag.toLowerCase().includes(query)))
    );
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const content = newPostContent().trim();
    if (!content) return;

    const user = account();
    if (!user) {
      alert("アカウントが選択されていません");
      return;
    }

    const success = await createPost(content, user.userName);
    if (success) {
      setNewPostContent("");
      setShowPostForm(false);
      refetch();
    } else {
      alert("投稿の作成に失敗しました");
    }
  };

  const handleLike = async (id: string) => {
    const user = account();
    if (!user) return;
    const likes = await likePost(id, user.userName);
    if (likes !== null) {
      mutate((prev) =>
        prev?.map((p) => p.id === id ? { ...p, likes, isLiked: true } : p)
      );
    }
  };

  const handleRetweet = async (id: string) => {
    const retweets = await retweetPost(id);
    if (retweets !== null) {
      mutate((prev) =>
        prev?.map((p) =>
          p.id === id ? { ...p, retweets, isRetweeted: true } : p
        )
      );
    }
  };

  const handleReply = (postId: string) => {
    _setReplyingTo(postId);
    setShowPostForm(true);
  };

  const handleEdit = async (id: string, current: string) => {
    const content = prompt("編集内容を入力してください", current);
    if (content === null) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    const success = await updatePost(id, trimmed);
    if (success) {
      refetch();
    } else {
      alert("投稿の更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この投稿を削除しますか？")) return;
    const success = await deletePost(id);
    if (success) {
      refetch();
    } else {
      alert("投稿の削除に失敗しました");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  return (
    <>
      <style>
        {`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .tab-btn { 
          @apply px-4 py-2 font-medium transition-all duration-200 ease-in-out;
          border-radius: 8px;
          background: transparent;
          color: #9ca3af;
          border-bottom: 2px solid transparent;
        }
        .tab-btn:hover {
          color: #d1d5db;
          background: rgba(75, 85, 99, 0.3);
        }
        .tab-btn-active { 
          color: #ffffff;
          background: rgba(59, 130, 246, 0.1);
          border-bottom-color: #3b82f6;
        }
        .tab-btn-active:hover {
          background: rgba(59, 130, 246, 0.15);
        }
      `}
      </style>
      <div class="min-h-screen text-white relative">
        {/* ヘッダー + タブ */}
        <div class="sticky top-0 z-20 backdrop-blur-md border-b border-gray-800">
          <div class="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              {/* <h1 class="text-xl font-bold">マイクロブログ</h1> 削除 */}
              <div class="flex justify-end w-full relative">
                <input
                  type="text"
                  placeholder="投稿・ユーザー・タグ検索"
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  class="bg-gray-800 rounded-full px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {/* タブ */}
            <div class="flex gap-4 justify-center">
              <button
                type="button"
                class={`tab-btn ${
                  tab() === "recommend" ? "tab-btn-active" : ""
                }`}
                onClick={() => {
                  setTab("recommend");
                  setShowCommunityView(false);
                }}
              >
                おすすめ
              </button>
              <button
                type="button"
                class={`tab-btn ${
                  tab() === "following" ? "tab-btn-active" : ""
                }`}
                onClick={() => {
                  setTab("following");
                  setShowCommunityView(false);
                }}
              >
                フォロー中
              </button>
              <button
                type="button"
                class={`tab-btn ${
                  tab() === "community" ? "tab-btn-active" : ""
                }`}
                onClick={() => {
                  setTab("community");
                  setShowCommunityView(false);
                  setSelectedCommunity(null);
                }}
              >
                コミュニティ
              </button>
            </div>
          </div>
        </div>
        <div class="max-w-2xl mx-auto">
          <CommunityView
            showCommunityView={showCommunityView()}
            setShowCommunityView={setShowCommunityView}
            selectedCommunity={selectedCommunity()}
            setSelectedCommunity={setSelectedCommunity}
            showCreateCommunity={showCreateCommunity()}
            setShowCreateCommunity={setShowCreateCommunity}
            communityName={communityName()}
            setCommunityName={setCommunityName}
            communityDescription={communityDescription()}
            setCommunityDescription={setCommunityDescription}
            communityAvatar={communityAvatar()}
            setCommunityAvatar={setCommunityAvatar}
            communityBanner={communityBanner()}
            setCommunityBanner={setCommunityBanner}
            communityTags={communityTags()}
            setCommunityTags={setCommunityTags}
            communityIsPrivate={communityIsPrivate()}
            setCommunityIsPrivate={setCommunityIsPrivate}
            communities={communitiesData() || []}
            communityPosts={[]}
            handleJoinCommunity={handleJoinCommunity}
            handleLeaveCommunity={handleLeaveCommunity}
            handleCreateCommunity={handleCreateCommunity}
            handleSelectCommunity={handleSelectCommunity}
            handleLikeCommunityPost={handleLikeCommunityPost}
            formatDate={formatDate}
          />

          {(tab() === "recommend" || tab() === "following" ||
            tab() === "community") && (
            <StoryTray
              stories={stories() || []}
              refetchStories={refetchStories}
              handleViewStory={handleViewStory}
            />
          )}

          {(tab() === "recommend" || tab() === "following" ||
            tab() === "community") && (
            <PostList
              posts={filteredPosts()}
              tab={tab()}
              handleReply={handleReply}
              handleRetweet={handleRetweet}
              handleLike={handleLike}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              formatDate={formatDate}
            />
          )}
        </div>

        <StoryViewer
          showStoryViewer={showStoryViewer()}
          selectedStory={selectedStory()}
          stories={stories() || []}
          currentStoryIndex={currentStoryIndex()}
          previousStory={previousStory}
          nextStory={nextStory}
          closeStoryViewer={closeStoryViewer}
          handleDeleteStory={handleDeleteStory}
          formatDate={formatDate}
        />

        <PostForm
          showPostForm={showPostForm()}
          setShowPostForm={setShowPostForm}
          newPostContent={newPostContent()}
          setNewPostContent={setNewPostContent}
          handleSubmit={handleSubmit}
          currentUser={account() || undefined}
        />

        {/* フローティング投稿ボタン（おすすめ・フォロー中・コミュニティタブの時のみ表示） */}
        {(tab() === "recommend" || tab() === "following" ||
          tab() === "community") && (
          <button
            type="button"
            onClick={() => setShowPostForm(true)}
            class="fixed bottom-6 right-6 z-30 bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
