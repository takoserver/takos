import { createResource, Show } from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchPostById } from "./api.ts";
import { renderNoteContent } from "../../utils/render.ts";
import { UserAvatar } from "./UserAvatar.tsx";

export default function PostView() {
  const params = useParams();
  const [post] = createResource(() => fetchPostById(params.id));

  return (
    <div class="p-4 text-white">
      <Show when={post()}>
        {(p) => (
          <div class="space-y-4">
            <div class="flex items-center space-x-3">
              <UserAvatar
                avatarUrl={p.authorAvatar}
                username={p.userName}
                size="w-10 h-10"
              />
              <div>
                <div class="font-bold">{p.displayName}</div>
                <div class="text-sm text-gray-400">@{p.userName}</div>
              </div>
            </div>
            <div innerHTML={renderNoteContent({ content: p.content })} />
          </div>
        )}
      </Show>
    </div>
  );
}
