import { createResource, Show } from "solid-js";
import { fetchPostById } from "./microblog/api.ts";
import { PostItem } from "./microblog/Post.tsx";

export default function PostView(props: { id: string }) {
  const [post] = createResource(() => fetchPostById(props.id));
  const formatDate = (d: string) => new Date(d).toLocaleString();
  const noop = () => {};
  return (
    <div class="p-4">
      <Show when={post()} keyed>
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
      </Show>
    </div>
  );
}
