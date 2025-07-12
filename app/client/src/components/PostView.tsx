import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchPostById } from "./microblog/api.ts";
import { PostItem } from "./microblog/Post.tsx";

export default function PostView() {
  const params = useParams();
  const [post] = createResource(() => fetchPostById(params.id));
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
