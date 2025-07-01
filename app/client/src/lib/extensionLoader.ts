// Takopack Extension Loader with Caching
// キャッシュを活用したスマート拡張機能ローダー

import {
  isCached,
  isCacheUpToDate,
  cacheExtension,
  getCachedFile,
  getCachedExtension,
  getExtensionAssetPath,
} from "./cache.ts";

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

interface LoadedExtension {
  manifest: ExtensionManifest;
  serverJs?: string;
  clientJs?: string;
  indexHtml?: string;
  iconDataUrl?: string;
}

/**
 * 拡張機能のmanifestを取得（キャッシュ優先、フォールバック: API）
 */
export const getExtensionManifest = async (extId: string): Promise<ExtensionManifest | null> => {
  try {
    // キャッシュから取得を試行
    const cached = await getCachedExtension(extId);
    if (cached) {
      console.log(`📦 Using cached manifest for ${extId}`);
      return cached.manifest;
    }

    // キャッシュにない場合、APIから取得
    console.log(`🌐 Fetching manifest for ${extId} from API`);
    const response = await fetch(`/api/extensions/${extId}/manifest.json`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Manifest not found in API for ${extId}, this may indicate the extension is not properly installed`);
      }
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }

    return await response.json() as ExtensionManifest;
  } catch (error) {
    console.error(`Failed to get manifest for ${extId}:`, error);
    return null;
  }
};

/**
 * 拡張機能のファイルを取得（キャッシュ優先、フォールバック: API）
 */
export const getExtensionFile = async (extId: string, fileName: string): Promise<string | null> => {
  try {
    // キャッシュから取得を試行
    const cached = await getCachedFile(extId, fileName);
    if (cached) {
      console.log(`📦 Using cached ${fileName} for ${extId}`);
      return cached;
    }

    // キャッシュにない場合、APIから取得
    console.log(`🌐 Fetching ${fileName} for ${extId} from API`);
    const response = await fetch(`/api/extensions/${extId}/${fileName}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📄 File ${fileName} not found for ${extId} (404) - this is normal if the file is not required`);
        return null; // ファイルが存在しない（正常）
      }
      throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
    }

    const content = await response.text();
    console.log(`✅ Successfully fetched ${fileName} for ${extId} (${content.length} bytes)`);
    return content;
  } catch (error) {
    console.error(`Failed to get ${fileName} for ${extId}:`, error);
    return null;
  }
};

/**
 * 拡張機能のUIファイルを取得（キャッシュ優先、フォールバック: API）
 */
export const getExtensionUI = async (extId: string): Promise<string | null> => {
  try {
    // キャッシュから取得を試行
    const cached = await getCachedFile(extId, "index.html");
    if (cached) {
      console.log(`📦 Using cached UI for ${extId}`);
      return cached;
    }

    // キャッシュにない場合、APIから取得
    console.log(`🌐 Fetching UI for ${extId} from API`);
    const response = await fetch(`/api/extensions/${extId}/ui`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📄 UI not found for ${extId} (404) - this extension may not have a UI component`);
        return null;
      }
      throw new Error(`Failed to fetch UI: ${response.status}`);
    }

    const content = await response.text();
    console.log(`✅ Successfully fetched UI for ${extId} (${content.length} bytes)`);
    return content;
  } catch (error) {
    console.error(`Failed to get UI for ${extId}:`, error);
    return null;
  }
};

/**
 * 拡張機能のアイコンを取得（キャッシュ優先、フォールバック: API）
 */
export const getExtensionIcon = async (extId: string): Promise<string | null> => {
  try {
    // キャッシュから取得を試行
    try {
      const cachedPath = await getExtensionAssetPath(extId, "icon.png");
      if (cachedPath) {
        console.log(`📦 Using cached icon for ${extId}`);
        return cachedPath;
      }
    } catch {
      // キャッシュにない場合は続行（エラーを無視）
    }

    // キャッシュにない場合、manifestを確認
    const manifest = await getExtensionManifest(extId);
    if (!manifest?.icon) {
      console.log(`📄 No icon defined in manifest for ${extId}`);
      return null;
    }

    // APIからアイコンを取得
    console.log(`🌐 Fetching icon for ${extId} from API`);
    const response = await fetch(`/api/extensions/${extId}/${manifest.icon}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📄 Icon not found for ${extId} (404)`);
        return null;
      }
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to get icon for ${extId}:`, error);
    return null;
  }
};

/**
 * 拡張機能の完全データを読み込み（スマートキャッシュ）
 */
export const loadExtension = async (extId: string, forceRefresh = false): Promise<LoadedExtension | null> => {
  try {
    console.log(`🔍 Loading extension ${extId} (forceRefresh: ${forceRefresh})`);
    
    // manifestを取得してバージョンチェック
    const manifest = await getExtensionManifest(extId);
    if (!manifest) {
      console.warn(`❌ No manifest found for extension ${extId}`);
      return null;
    }

    console.log(`📋 Manifest loaded for ${extId}:`, {
      name: manifest.name,
      version: manifest.version,
      hasServer: !!manifest.server?.entry,
      hasClientBg: !!manifest.client?.entryBackground,
      hasClientUI: !!manifest.client?.entryUI,
      hasIcon: !!manifest.icon
    });

    // キャッシュ状態を確認
    const isCachedExt = await isCached(extId);
    const isUpToDate = isCachedExt && await isCacheUpToDate(extId, manifest.version);

    console.log(`💾 Cache status for ${extId}:`, {
      isCached: isCachedExt,
      isUpToDate: isUpToDate
    });

    if (!forceRefresh && isUpToDate) {
      // キャッシュが最新の場合、キャッシュから全データを取得
      console.log(`📦 Loading extension ${extId} from cache`);
      const cached = await getCachedExtension(extId);
      if (cached) {
        return {
          manifest: cached.manifest,
          serverJs: cached.files.serverJs,
          clientJs: cached.files.clientJs,
          indexHtml: cached.files.indexHtml,
          iconDataUrl: cached.files.iconDataUrl,
        };
      }
    }

    // 新しいデータを取得
    console.log(`🔄 Loading extension ${extId} from API (version: ${manifest.version})`);
    
    // manifestに基づいて必要なファイルのみ取得
    const promises: Promise<string | null>[] = [];
    
    // server.jsは必須ではない（serverエントリが定義されている場合のみ）
    if (manifest.server?.entry) {
      promises.push(getExtensionFile(extId, "server.js"));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // client.jsは必須ではない（clientエントリが定義されている場合のみ）
    if (manifest.client?.entryBackground) {
      promises.push(getExtensionFile(extId, "client.js"));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // UIは必須ではない（clientエントリのentryUIが定義されている場合のみ）
    if (manifest.client?.entryUI) {
      promises.push(getExtensionUI(extId));
    } else {
      promises.push(Promise.resolve(null));
    }
    
    // アイコンは必須ではない
    promises.push(getExtensionIcon(extId));
    
    const [serverJs, clientJs, indexHtml, iconDataUrl] = await Promise.all(promises);

    const loadedExtension: LoadedExtension = {
      manifest,
      serverJs: serverJs || undefined,
      clientJs: clientJs || undefined,
      indexHtml: indexHtml || undefined,
      iconDataUrl: iconDataUrl || undefined,
    };

    // 新しいデータをキャッシュに保存
    try {
      await cacheExtension(extId, manifest, {
        serverJs: loadedExtension.serverJs,
        clientJs: loadedExtension.clientJs,
        indexHtml: loadedExtension.indexHtml,
        iconDataUrl: loadedExtension.iconDataUrl,
      });
    } catch (cacheError) {
      console.warn(`Failed to cache extension ${extId}:`, cacheError);
      // キャッシュ失敗でも拡張機能は使用可能
    }

    return loadedExtension;
  } catch (error) {
    console.error(`Failed to load extension ${extId}:`, error);
    return null;
  }
};

/**
 * 拡張機能データをプリロード（バックグラウンドでキャッシュを更新）
 */
export const preloadExtension = async (extId: string): Promise<void> => {
  try {
    console.log(`🚀 Preloading extension ${extId}`);
    await loadExtension(extId, false);
  } catch (error) {
    console.warn(`Failed to preload extension ${extId}:`, error);
  }
};

/**
 * 拡張機能のキャッシュを強制更新
 */
export const refreshExtensionCache = async (extId: string): Promise<LoadedExtension | null> => {
  console.log(`🔄 Force refreshing cache for extension ${extId}`);
  return await loadExtension(extId, true);
};

/**
 * 複数の拡張機能を並列プリロード
 */
export const preloadExtensions = async (extIds: string[]): Promise<void> => {
  console.log(`🚀 Preloading ${extIds.length} extensions`);
  await Promise.allSettled(extIds.map(preloadExtension));
  console.log(`✅ Preloading completed for ${extIds.length} extensions`);
};
