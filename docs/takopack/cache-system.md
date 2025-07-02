# Takopack キャッシュシステム仕様書

## 📋 概要

Takopackの拡張機能をローカルキャッシュして、高速な読み込みと再利用を実現する新しいキャッシュシステムです。

## 🎯 主な目的

1. **高速化**:
   拡張機能のHTML、JavaScript、manifestをローカルに保存し、初回読み込み後の高速アクセスを実現
2. **オフライン対応**: ネットワーク不要でキャッシュされた拡張機能を利用可能
3. **帯域幅削減**: 同一拡張機能の繰り返しダウンロードを避ける
4. **バージョン管理**: 拡張機能のバージョンが更新された際の自動キャッシュ更新

## 🏗️ アーキテクチャ

### キャッシュストレージ

- **ストレージ**: ブラウザのlocalStorage
- **キー形式**:
  - キャッシュデータ: `takopack_cache_{extensionId}`
  - メタデータ: `takopack_metadata_{extensionId}`

### キャッシュデータ構造

```typescript
interface CachedExtension {
  manifest: ExtensionManifest;
  files: {
    serverJs?: string; // server.js の内容
    clientJs?: string; // client.js の内容
    indexHtml?: string; // index.html の内容
    iconDataUrl?: string; // アイコンのData URL
  };
  metadata: {
    cachedAt: string; // キャッシュ日時
    version: string; // 拡張機能バージョン
    size: number; // データサイズ（バイト）
  };
}
```

## 🔧 主要コンポーネント

### 1. cache.ts - キャッシュ管理システム

**主な機能:**

- 拡張機能データの保存・取得
- バージョン管理
- キャッシュサイズ計算
- キャッシュクリア機能

**主要API:**

```typescript
// キャッシュ状態確認
isCached(extId: string): boolean
isCacheUpToDate(extId: string, currentVersion: string): boolean

// データ操作
cacheExtension(extId, manifest, files): void
getCachedExtension(extId: string): CachedExtension | null
getCachedFile(extId: string, fileName: string): string | null

// キャッシュ管理
clearExtensionCache(extId: string): void
clearAllExtensionCache(): void
getCacheSize(): { totalItems: number; estimatedSizeKB: number }
```

### 2. extensionLoader.ts - スマートローダー

**読み込み戦略:**

1. キャッシュ確認
2. キャッシュが存在する場合はそのまま使用（更新チェックなし）
3. キャッシュがない場合のみ API から取得してキャッシュ保存
4. 更新チェックを行う場合は `forceRefresh=true` を指定

**主要API:**

```typescript
loadExtension(extId: string, forceRefresh?: boolean): Promise<LoadedExtension | null>
preloadExtension(extId: string): Promise<void>
refreshExtensionCache(extId: string): Promise<LoadedExtension | null>
```

### 3. ExtensionFrame.tsx - 改良されたUI読み込み

**機能改善:**

- BlobURLを使用したキャッシュ済みHTMLの読み込み
- フォールバック機能（キャッシュ失敗時のAPI取得）
- ローディング状態の表示
- エラーハンドリングと再試行機能

### 4. takos.ts - Workerキャッシュ対応

**Worker作成の改善:**

- キャッシュされたclient.jsからBlobURLでWorker作成
- フォールバック機能（キャッシュ失敗時のAPI取得）

### 5. CacheManager.tsx - キャッシュ管理UI

**提供機能:**

- キャッシュ一覧表示
- 個別/全体キャッシュクリア
- キャッシュ強制更新
- キャッシュサイズ表示

## 🔄 ワークフロー

### 拡張機能初回読み込み

```
1. ExtensionFrame読み込み開始
2. loadExtension(extId) 呼び出し
3. キャッシュ確認 → 存在しない
4. APIからmanifest取得
5. 並列でserver.js, client.js, index.html, iconを取得
6. 取得データをキャッシュに保存
7. ExtensionFrameでBlobURL経由読み込み
```

### 拡張機能再読み込み

```
1. ExtensionFrame読み込み開始
2. loadExtension(extId) 呼び出し
3. キャッシュ確認 → 存在する場合はそのまま使用
4. 更新が必要なときは `refreshExtensionCache` を呼び出す
5. ExtensionFrameでBlobURL経由読み込み
```

### バージョン更新時

```
1. loadExtension(extId) 呼び出し
2. キャッシュ確認 → 存在する
3. `refreshExtensionCache(extId)` を実行
4. APIから新しいデータ取得
5. キャッシュを新しいデータで更新
6. 新しいデータで読み込み
```

> **サーバーとクライアントの同期更新**
>
> `refreshExtensionCache` は manifest
> を取得後、必要なファイルをすべて一括でダウンロードします。そのため `server.js`
> と `client.js`
> が常に同じバージョンでキャッシュされ、実行時にバージョン不整合が起きにくくなります。

## ⚡ パフォーマンス特性

### 読み込み時間比較

- **初回**: API取得 + キャッシュ保存（従来とほぼ同等）
- **2回目以降**: キャッシュ読み込み（**大幅高速化**）

### 期待効果

- **UI読み込み**: 50-80% 高速化
- **Worker作成**: 40-70% 高速化
- **ネットワーク負荷**: 80-95% 削減（2回目以降）

## 🛡️ エラーハンドリング

### フォールバック戦略

1. **キャッシュ読み込み失敗**: 自動的にAPI取得にフォールバック
2. **BlobURL作成失敗**: 従来のURL指定方式にフォールバック
3. **キャッシュ破損**: 該当キャッシュを削除してAPI再取得

### エラー処理

- キャッシュ操作エラーは警告ログのみ（アプリ継続実行）
- 重要なエラーはユーザーに通知
- Retryボタンでユーザー主導の復旧

## 📏 制限事項

### ストレージ制限

- **localStorage容量**: ブラウザ依存（通常5-10MB）
- **大規模拡張機能**: 制限に達した場合の自動クリア機能

### 対象ファイル

- **対象**: manifest.json, server.js, client.js, index.html, アイコン
- **対象外**: 動的生成コンテンツ、外部リソース

## 🔧 設定とカスタマイズ

### キャッシュポリシー

- **デフォルト**: キャッシュを優先し更新チェックは行わない
- **強制更新**: `forceRefresh=true` を指定してアップデートを実行
- **プリロード**: バックグラウンドでの事前キャッシュ

### 開発者向け

```typescript
// キャッシュ無効化（デバッグ用）
clearExtensionCache("com.example.extension");

// 強制リフレッシュ
refreshExtensionCache("com.example.extension");

// プリロード
preloadExtensions(["ext1", "ext2", "ext3"]);
```

## 🚀 今後の拡張予定

### Phase 2

- **IndexedDB移行**: より大容量のストレージ
- **圧縮**: gzip圧縮によるストレージ効率化
- **優先度管理**: LRUベースの自動クリア

### Phase 3

- **差分更新**: ファイル単位での部分更新
- **CDN連携**: CDN経由でのキャッシュ最適化
- **オフライン検出**: ネットワーク状態に応じた動作変更

---

**最終更新**: 2025年6月30日 **バージョン**: 1.0.0
