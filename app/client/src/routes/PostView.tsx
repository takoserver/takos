import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchPostById } from "../components/microblog/api.ts";
import { renderNoteContent } from "../utils/render.ts";

export default function PostView() {
  const params = useParams();
  const [post] = createResource(() => fetchPostById(params.id));
  return (
    <Show when={post()}>
      {(p) => (
        <div class="p-4 text-gray-100">
          <div innerHTML={renderNoteContent({ content: p.content })} />
        </div>
      )}
    </Show>
  );
}
