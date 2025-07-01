import { createEffect, createSignal, onCleanup } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedExtensionState } from "../states/extensions.ts";
import { createTakos } from "../takos.ts";
import { loadExtension } from "../lib/extensionLoader.ts";

interface TakosGlobal {
  takos?: unknown;
  __takosEventDefs?: Record<string, Record<string, unknown>>;
}

export default function ExtensionFrame() {
  const [extId] = useAtom(selectedExtensionState);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let frame: HTMLIFrameElement | undefined;

  createEffect(async () => {
    if (frame && extId()) {
      const currentExtId = extId()!;
      setIsLoading(true);
      setError(null);

      try {
        // キャッシュを活用した拡張機能の読み込み
        const loadedExtension = await loadExtension(currentExtId);

        if (loadedExtension?.indexHtml) {
          // ベースURLとアセットパスを補正してBlobURLを生成
          const basePath = `${location.origin}/api/extensions/${currentExtId}/`;
          let html = loadedExtension.indexHtml;

          const injections: string[] = [];
          if (!html.includes("<base")) {
            injections.push(`<base href="${basePath}">`);
          }
          if (!html.includes("window.takos")) {
            injections.push(
              `<script>window.takos = window.takos || {};</script>`,
            );
          }
          if (injections.length) {
            html = html.replace(/<head>/i, `<head>${injections.join("")}`);
          }

          html = html.replace(/(src|href)="\/(.*?)"/g, `$1="${basePath}$2"`);
          html = html.replace(/(src|href)='\/(.*?)'/g, `$1='${basePath}$2'`);

          const blob = new Blob([html], { type: "text/html" });
          const blobUrl = URL.createObjectURL(blob);
          frame.src = blobUrl;

          // 古いBlobURLをクリーンアップ
          frame.addEventListener("load", () => {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          }, { once: true });
        } else {
          // フォールバック: 従来のAPI経由での読み込み
          console.warn(
            `No cached HTML for ${currentExtId}, falling back to API`,
          );
          frame.src = `/api/extensions/${currentExtId}/ui`;
        }
      } catch (err) {
        console.error(`Failed to load extension ${currentExtId}:`, err);
        setError(
          `Failed to load extension: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        // エラー時のフォールバック
        frame.src = `/api/extensions/${currentExtId}/ui`;
      } finally {
        setIsLoading(false);
      }
    }
  });

  function onLoad() {
    try {
      if (frame?.contentWindow && extId()) {
        const id = extId()!;
        const takos = createTakos(id);
        const child = frame.contentWindow as Window & TakosGlobal;
        if (child.takos && typeof child.takos === "object") {
          Object.assign(child.takos as Record<string, unknown>, takos);
        } else {
          child.takos = takos;
        }
        const host = window as Window & TakosGlobal;
        const defs = host.__takosEventDefs?.[id] || {};
        child.__takosEventDefs = child.__takosEventDefs || {};
        child.__takosEventDefs[id] = defs;

        // 読み込み完了時にエラーをクリア
        setError(null);
      }
    } catch (err) {
      console.error("Failed to setup takos in iframe:", err);
      setError("Failed to initialize extension environment");
    }
  }

  onCleanup(() => {
    if (frame) frame.src = "about:blank";
  });

  return (
    <div class="w-full h-full relative">
      {isLoading() && (
        <div class="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2">
            </div>
            <div class="text-sm text-gray-600">Loading extension...</div>
          </div>
        </div>
      )}

      {error() && (
        <div class="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
          <div class="text-center p-4">
            <div class="text-red-600 mb-2">⚠️ Extension Load Error</div>
            <div class="text-sm text-red-500">{error()}</div>
            <button
              type="button"
              class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              onClick={() => {
                setError(null);
                // エラー時の再読み込み
                if (frame && extId()) {
                  frame.src = `/api/extensions/${extId()}/ui`;
                }
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <iframe
        ref={(el) => {
          frame = el;
        }}
        sandbox="allow-scripts allow-same-origin"
        class="w-full h-full border-none"
        style={{ display: isLoading() || error() ? "none" : "block" }}
        onLoad={onLoad}
        onError={() => setError("Failed to load extension frame")}
      />
    </div>
  );
}
