
// Takopack Extension Cache System with Tauri Storage
// Tauriストレージを使用した拡張機能キャッシュ管理

import { Store } from '@tauri-apps/plugin-store';

interface ExtensionManifest {
  identifier: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  permissions?: string[];
  server?: { entry: string };
  client?: { entryUI?: string; entryBackground?: string };
}

interface CachedExtension {
  manifest: ExtensionManifest;
  files: {
    serverJs?: string;
    clientJs?: string;
    indexHtml?: string;
    iconDataUrl?: string;
  };
  metadata: {
    cachedAt: string;
    version: string;
    size: number;
  };
}

// Tauriストレージインスタンス
let store: Store | null = null;

/**
 * ストレージの初期化
 */
async function initStore(): Promise<Store> {
  if (store) {
    return store;
  }

  try {
    store = await Store.load("takopack-cache.dat");
    return store;
  } catch (error) {
    throw new Error(`Failed to initialize Tauri Store: ${error}`);
  }
}

/**
 * Tauriストレージのフォールバック関数（非Tauri環境用）
 */
function isTauriEnvironment(): boolean {
  return typeof Store !== 'undefined' && typeof Store.load === 'function';
}

// 拡張機能キャッシュのキー
const getCacheKey = (extId: string) => `cache_${extId}`;
const getMetadataKey = (extId: string) => `metadata_${extId}`;

/**
 * 拡張機能がキャッシュされているかどうかを確認
 */
export const isCached = async (extId: string): Promise<boolean> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      const metadata = await store.get<CachedExtension["metadata"]>(getMetadataKey(extId));
      return !!metadata;
    } else {
      // フォールバック: localStorage
      const metadata = localStorage.getItem(getMetadataKey(extId));
      return !!metadata;
    }
  } catch {
    return false;
  }
};

/**
 * キャッシュされた拡張機能のメタデータを取得
 */
export const getCacheMetadata = async (extId: string): Promise<CachedExtension["metadata"] | null> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      return await store.get<CachedExtension["metadata"]>(getMetadataKey(extId)) || null;
    } else {
      // フォールバック: localStorage
      const metadata = localStorage.getItem(getMetadataKey(extId));
      return metadata ? JSON.parse(metadata) : null;
    }
  } catch (e) {
    console.warn(`Failed to read cache metadata for ${extId}:`, e);
    return null;
  }
};

/**
 * キャッシュされた拡張機能が最新バージョンかどうかを確認
 */
export const isCacheUpToDate = async (extId: string, currentVersion: string): Promise<boolean> => {
  const metadata = await getCacheMetadata(extId);
  return metadata?.version === currentVersion;
};

/**
 * 拡張機能の完全キャッシュ（manifest + 全ファイル）
 */
export const cacheExtension = async (
  extId: string,
  manifest: ExtensionManifest,
  files: {
    serverJs?: string;
    clientJs?: string;
    indexHtml?: string;
    iconDataUrl?: string;
  },
): Promise<void> => {
  try {
    // ファイルサイズ計算
    const textSize = (files.serverJs?.length || 0) + 
                    (files.clientJs?.length || 0) + 
                    (files.indexHtml?.length || 0) +
                    (files.iconDataUrl?.length || 0);

    // キャッシュデータを構築
    const cacheData: CachedExtension = {
      manifest,
      files,
      metadata: {
        cachedAt: new Date().toISOString(),
        version: manifest.version,
        size: textSize,
      },
    };

    if (isTauriEnvironment()) {
      // Tauriストレージに保存
      const store = await initStore();
      await store.set(getCacheKey(extId), cacheData);
      await store.set(getMetadataKey(extId), cacheData.metadata);
      await store.save();
    } else {
      // フォールバック: localStorage
      localStorage.setItem(getCacheKey(extId), JSON.stringify(cacheData));
      localStorage.setItem(getMetadataKey(extId), JSON.stringify(cacheData.metadata));
    }

    console.log(`✅ Cached extension ${extId} v${manifest.version} (${Math.round(textSize / 1024)}KB)`);
  } catch (error) {
    console.error(`Failed to cache extension ${extId}:`, error);
    // キャッシュに失敗した場合、部分的なデータを削除
    try {
      if (isTauriEnvironment()) {
        const store = await initStore();
        await store.delete(getCacheKey(extId));
        await store.delete(getMetadataKey(extId));
        await store.save();
      } else {
        localStorage.removeItem(getCacheKey(extId));
        localStorage.removeItem(getMetadataKey(extId));
      }
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
};

/**
 * キャッシュされた拡張機能データを取得
 */
export const getCachedExtension = async (extId: string): Promise<CachedExtension | null> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      return await store.get<CachedExtension>(getCacheKey(extId)) || null;
    } else {
      // フォールバック: localStorage
      const cached = localStorage.getItem(getCacheKey(extId));
      return cached ? JSON.parse(cached) as CachedExtension : null;
    }
  } catch (e) {
    console.warn(`Failed to read cached extension ${extId}:`, e);
    return null;
  }
};

/**
 * キャッシュされたファイルの内容を取得
 */
export const getCachedFile = async (extId: string, fileName: string): Promise<string | null> => {
  try {
    const cached = await getCachedExtension(extId);
    if (!cached) return null;

    switch (fileName) {
      case "server.js":
        return cached.files.serverJs || null;
      case "client.js":
        return cached.files.clientJs || null;
      case "index.html":
        return cached.files.indexHtml || null;
      default:
        return null;
    }
  } catch (e) {
    console.warn(`Failed to read cached file ${fileName} for ${extId}:`, e);
  }
  return null;
};

/**
 * キャッシュされたアセット（アイコンなど）のパスを取得
 */
export const getExtensionAssetPath = async (
  extId: string,
  assetPath: string,
): Promise<string> => {
  try {
    const cached = await getCachedExtension(extId);
    if (cached?.files.iconDataUrl && assetPath === "icon.png") {
      return cached.files.iconDataUrl;
    }
    throw new Error(`Asset not found: ${assetPath}`);
  } catch (_error) {
    throw new Error(`Asset not found: ${assetPath}`);
  }
};

/**
 * 拡張機能のキャッシュを削除
 */
export const clearExtensionCache = async (extId: string): Promise<void> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      await store.delete(getCacheKey(extId));
      await store.delete(getMetadataKey(extId));
      await store.save();
    } else {
      // フォールバック: localStorage
      localStorage.removeItem(getCacheKey(extId));
      localStorage.removeItem(getMetadataKey(extId));
    }
    console.log(`🗑️ Cleared cache for extension ${extId}`);
  } catch (e) {
    console.warn(`Failed to clear cache for ${extId}:`, e);
  }
};

/**
 * 全ての拡張機能キャッシュを削除
 */
export const clearAllExtensionCache = async (): Promise<void> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      await store.clear();
      await store.save();
    } else {
      // フォールバック: localStorage
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key: string) => key.startsWith('cache_') || key.startsWith('metadata_'));
      
      for (const key of cacheKeys) {
        localStorage.removeItem(key);
      }
    }
    
    console.log("🗑️ Cleared all extension cache");
  } catch (e) {
    console.warn("Failed to clear all extension cache:", e);
  }
};

/**
 * キャッシュサイズを取得（概算）
 */
export const getCacheSize = async (): Promise<{ totalItems: number; estimatedSizeKB: number }> => {
  try {
    if (isTauriEnvironment()) {
      const store = await initStore();
      const keys = await store.keys();
      const cacheKeys = keys.filter((key: string) => key.startsWith('cache_'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await store.get<CachedExtension>(key);
        if (value) {
          totalSize += value.metadata.size;
        }
      }
      
      return {
        totalItems: cacheKeys.length,
        estimatedSizeKB: Math.round(totalSize / 1024)
      };
    } else {
      // フォールバック: localStorage
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key: string) => key.startsWith('cache_'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return {
        totalItems: cacheKeys.length,
        estimatedSizeKB: Math.round(totalSize / 1024)
      };
    }
  } catch (e) {
    console.warn("Failed to calculate cache size:", e);
    return { totalItems: 0, estimatedSizeKB: 0 };
  }
};

/**
 * 全てのキャッシュエントリを取得
 */
export const getAllCacheEntries = async (): Promise<Array<{
  extId: string;
  name: string;
  version: string;
  cachedAt: string;
  size: number;
}>> => {
  try {
    const entries = [];
    
    if (isTauriEnvironment()) {
      const store = await initStore();
      const keys = await store.keys();
      const cacheKeys = keys.filter((key: string) => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const extId = key.replace('cache_', '');
        const cached = await store.get<CachedExtension>(key);
        if (cached) {
          entries.push({
            extId,
            name: cached.manifest?.name || extId,
            version: cached.metadata?.version || 'unknown',
            cachedAt: cached.metadata?.cachedAt || 'unknown',
            size: cached.metadata?.size || 0,
          });
        }
      }
    } else {
      // フォールバック: localStorage
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key: string) => key.startsWith('cache_'));
      
      for (const key of cacheKeys) {
        const extId = key.replace('cache_', '');
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData = JSON.parse(cached) as CachedExtension;
            entries.push({
              extId,
              name: cacheData.manifest?.name || extId,
              version: cacheData.metadata?.version || 'unknown',
              cachedAt: cacheData.metadata?.cachedAt || 'unknown',
              size: cacheData.metadata?.size || 0,
            });
          }
        } catch (error) {
          console.warn(`Failed to parse cache data for ${extId}:`, error);
        }
      }
    }
    
    return entries.sort((a, b) => 
      new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime()
    );
  } catch (e) {
    console.warn("Failed to get cache entries:", e);
    return [];
  }
};
