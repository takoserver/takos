import { createSignal, For, onMount, Show } from "solid-js";
import { createTakos } from "../takos.ts";
import { preloadExtension } from "../lib/extensionLoader.ts";

interface PackageInfo {
  identifier: string;
  name: string;
  version: string;
  description?: string;
  downloadUrl: string;
  sha256?: string;
}

interface Props {
  hideHeader?: boolean;
}

export default function ExtensionRegistry(props: Props = {}) {
  const [packages, setPackages] = createSignal<PackageInfo[]>([]);
  const [installed, setInstalled] = createSignal<string[]>([]);
  const [query, setQuery] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [installing, setInstalling] = createSignal<string | null>(null);

  const fetchPackages = async (q = "") => {
    setIsLoading(true);
    try {
      const body = {
        events: [
          {
            identifier: "takos",
            eventId: "extensions:search",
            payload: q ? { q } : {},
          },
        ],
      };
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data[0]?.result?.packages ?? []);
      } else {
        setPackages([]);
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstalled = async () => {
    try {
      const body = {
        events: [
          { identifier: "takos", eventId: "extensions:list", payload: null },
        ],
      };
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const ids = (data[0]?.result ?? []).map((p: { identifier: string }) =>
          p.identifier
        );
        setInstalled(ids);
        
        // インストール済み拡張機能をプリロード
        console.log(`🚀 Preloading ${ids.length} installed extensions`);
        for (const id of ids) {
          createTakos(id);
          // バックグラウンドでキャッシュ更新
          preloadExtension(id).catch(error => 
            console.warn(`Failed to preload extension ${id}:`, error)
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch installed extensions:", error);
    }
  };

  const install = async (id: string) => {
    setInstalling(id);
    try {
      const body = {
        events: [
          { identifier: "takos", eventId: "extensions:install", payload: { id } },
        ],
      };
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (res.ok) {
        console.log(`✅ Extension ${id} installed successfully`);
        await fetchInstalled();
        createTakos(id);
        
        // インストール後即座にキャッシュを作成
        console.log(`📦 Caching extension ${id}...`);
        await preloadExtension(id);
        console.log(`✅ Extension ${id} cached successfully`);
      } else {
        console.error(`Failed to install extension ${id}`);
      }
    } catch (error) {
      console.error(`Error installing extension ${id}:`, error);
    } finally {
      setInstalling(null);
    }
  };

  onMount(() => {
    fetchInstalled();
    fetchPackages();
  });

  return (
    <div>
      {!props.hideHeader && <h3 class="text-lg mb-2">Registry</h3>}
      <div class="mb-2 flex gap-2">
        <input
          type="text"
          placeholder="Search extensions"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPackages(query())}
          class="flex-1 border px-2 py-1 bg-transparent"
        />
        <button
          type="button"
          class="border px-2 py-1 disabled:opacity-50"
          onClick={() => fetchPackages(query())}
          disabled={isLoading()}
        >
          {isLoading() ? "Searching..." : "Search"}
        </button>
      </div>
      <ul class="space-y-2 max-h-96 overflow-y-auto">
        <Show when={packages().length > 0} fallback={<li>No packages found</li>}>
          <For each={packages()}>
            {(pkg) => (
              <li class="p-2 border border-gray-700 rounded">
                <div class="flex justify-between">
                  <div class="pr-2">
                    <p class="font-semibold">{pkg.name}</p>
                    <p class="text-xs text-gray-400">{pkg.description}</p>
                    <p class="text-xs text-gray-500">v{pkg.version}</p>
                  </div>
                  <div class="flex items-start">
                    <button
                      type="button"
                      class="text-sm text-blue-500 underline disabled:text-gray-500 disabled:no-underline"
                      disabled={installed().includes(pkg.identifier) || installing() === pkg.identifier}
                      onClick={() => install(pkg.identifier)}
                    >
                      {installing() === pkg.identifier
                        ? "Installing..."
                        : installed().includes(pkg.identifier)
                        ? "Installed"
                        : "Install"}
                    </button>
                  </div>
                </div>
              </li>
            )}
          </For>
        </Show>
      </ul>
    </div>
  );
}
