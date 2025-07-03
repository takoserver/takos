import { createSignal, onMount, For, Show } from "solid-js";
import {
  getCacheSize,
  clearExtensionCache,
  clearAllExtensionCache,
  getAllCacheEntries,
} from "../lib/cache.ts";
import { refreshExtensionCache } from "../lib/extensionLoader.ts";

interface CacheEntry {
  extId: string;
  name: string;
  version: string;
  cachedAt: string;
  size: number;
}

export default function CacheManager() {
  const [cacheEntries, setCacheEntries] = createSignal<CacheEntry[]>([]);
  const [totalSize, setTotalSize] = createSignal(0);
  const [totalItems, setTotalItems] = createSignal(0);
  const [isRefreshing, setIsRefreshing] = createSignal<string | null>(null);
  const [isClearing, setIsClearing] = createSignal(false);

  const loadCacheInfo = async () => {
    try {
      // キャッシュサイズ情報を取得
      const sizeInfo = await getCacheSize();
      setTotalSize(sizeInfo.estimatedSizeKB);
      setTotalItems(sizeInfo.totalItems);

      // 各拡張機能のキャッシュ情報を取得
      const entries = await getAllCacheEntries();
      setCacheEntries(entries);
    } catch (error) {
      console.error("Failed to load cache info:", error);
    }
  };

  const refreshExtension = async (extId: string) => {
    setIsRefreshing(extId);
    try {
      console.log(`🔄 Refreshing cache for ${extId}`);
      const result = await refreshExtensionCache(extId);
      if (result) {
        console.log(`✅ Successfully refreshed cache for ${extId}`);
        await loadCacheInfo();
      }
    } catch (error) {
      console.error(`Failed to refresh cache for ${extId}:`, error);
    } finally {
      setIsRefreshing(null);
    }
  };

  const clearExtension = async (extId: string) => {
    try {
      await clearExtensionCache(extId);
      await loadCacheInfo();
      console.log(`🗑️ Cleared cache for ${extId}`);
    } catch (error) {
      console.error(`Failed to clear cache for ${extId}:`, error);
    }
  };

  const clearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllExtensionCache();
      await loadCacheInfo();
      console.log("🗑️ Cleared all extension cache");
    } catch (error) {
      console.error("Failed to clear all cache:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  };

  onMount(() => {
    loadCacheInfo().catch(error => {
      console.error("Failed to load cache info on mount:", error);
    });
  });

  return (
    <div class="p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Extension Cache</h3>
        <div class="flex gap-2">
          <button
            type="button"
            class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            onClick={loadCacheInfo}
          >
            Refresh
          </button>
          <button
            type="button"
            class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
            onClick={clearAll}
            disabled={isClearing()}
          >
            {isClearing() ? "Clearing..." : "Clear All"}
          </button>
        </div>
      </div>

      <div class="bg-gray-100 p-3 rounded mb-4">
        <div class="text-sm text-gray-600">
          <div>Total cached extensions: <span class="font-medium">{totalItems()}</span></div>
          <div>Estimated cache size: <span class="font-medium">{totalSize()}KB</span></div>
        </div>
      </div>

      <div class="space-y-2">
        <Show when={cacheEntries().length > 0} fallback={
          <div class="text-center text-gray-500 py-8">
            No cached extensions found
          </div>
        }>
          <For each={cacheEntries()}>
            {(entry) => (
              <div class="border border-gray-300 rounded p-3">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="font-medium">{entry.name}</div>
                    <div class="text-sm text-gray-600">
                      ID: {entry.extId} • Version: {entry.version}
                    </div>
                    <div class="text-xs text-gray-500">
                      Cached: {formatDate(entry.cachedAt)} • Size: {formatSize(entry.size)}
                    </div>
                  </div>
                  
                  <div class="flex gap-2 ml-4">
                    <button
                      type="button"
                      class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
                      onClick={() => refreshExtension(entry.extId)}
                      disabled={isRefreshing() === entry.extId}
                    >
                      {isRefreshing() === entry.extId ? "..." : "Refresh"}
                    </button>
                    
                    <button
                      type="button"
                      class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      onClick={() => clearExtension(entry.extId)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      <div class="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 class="font-medium text-blue-800 mb-2">💡 Cache Information</h4>
        <div class="text-sm text-blue-700 space-y-1">
          <div>• Extensions are automatically cached when loaded for faster access</div>
          <div>• Cached files include HTML, JavaScript, and manifest data</div>
          <div>• Cache is updated when extension versions change</div>
          <div>• Use "Refresh" to force update a specific extension's cache</div>
          <div>• Use "Clear All" to remove all cached data and free up storage</div>
        </div>
      </div>
    </div>
  );
}
