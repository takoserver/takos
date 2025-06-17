import { createEffect, onCleanup } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedExtensionState } from "../states/extensions.ts";
import { createTakos } from "../takos.ts";
import { loadExtensionWorker } from "../extensionWorker.ts";

export default function ExtensionFrame() {
  const [extId] = useAtom(selectedExtensionState);
  let frame: HTMLIFrameElement | undefined;

  createEffect(() => {
    if (frame && extId()) {
      frame.src = `/api/extensions/${extId()}/ui`;
    }
  });

  async function onLoad() {
    try {
      if (frame?.contentWindow && extId()) {
        const id = extId()!;
        const takos = createTakos(id);
        (frame.contentWindow as any).takos = takos;

        const defs = (frame.contentWindow as any).__takosEventDefs?.[id] || {};
        const worker = await loadExtensionWorker(id, takos);
        const events: Record<string, (payload: unknown) => Promise<unknown>> = {};
        for (const [ev, def] of Object.entries(defs)) {
          const handler = (def as { handler?: string }).handler;
          if (handler) {
            events[ev] = (payload: unknown) => worker.call(handler, [payload]) as Promise<unknown>;
          }
        }
        (window as any).__takosClientEvents = (window as any).__takosClientEvents || {};
        (window as any).__takosClientEvents[id] = events;
      }
    } catch (_e) {
      /* ignore */
    }
  }

  onCleanup(() => {
    if (frame) frame.src = "about:blank";
  });

  return (
    <iframe
      ref={frame!}
      sandbox="allow-scripts allow-same-origin"
      class="w-full h-full border-none"
      onLoad={onLoad}
    />
  );
}
