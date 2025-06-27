# 🚀 Comprehensive Takos API Demo

**完全で完璧なTakopack API サンプルプロジェクト**

このプロジェクトは、Takopackエクステンションシステムの全ての機能を包括的にデモンストレーションする完全なサンプルです。実際のプロダクション環境で使用できるコード例と、各APIの詳細な使用方法を提供します。

## 📋 概要

Comprehensive Takos API Demoは、以下の全てのTakos API機能を網羅しています：

### 🏗️ アーキテクチャ

```
Takopack Multi-Runtime Architecture
├── Server Environment (Deno on Server)
│   ├── ActivityPub統合
│   ├── KVストレージ操作
│   ├── CDNファイル管理
│   ├── イベント配信
│   ├── セキュリティ機能
│   └── パフォーマンステスト
├── Client Environment (Service Worker)
│   ├── バックグラウンド処理
│   ├── キャッシュ管理
│   ├── ネットワーク操作
│   ├── オフライン対応
│   └── クライアントストレージ
└── UI Environment (iframe sandbox)
    ├── インタラクティブUI
    ├── リアルタイム統計
    ├── 視覚的なテスト結果
    └── ユーザーフレンドリーなコントロール
```

## 🚀 機能一覧

### 📡 ActivityPub API

- **完全なActivityPub統合**: Note投稿、Actor管理、カスタムオブジェクト作成
- **リアルタイム配信**: フォロワーへのコンテンツ配信
- **カスタムオブジェクト**: Takos独自のActivityPubオブジェクト拡張
- **受信ハンドリング**: 外部からのActivity受信と処理

### 💾 KV Storage API

- **基本操作**: キー・バリューの読み書き、削除
- **バッチ操作**: 複数のキーを効率的に処理
- **大容量データ**: 大きなデータセットの管理
- **データ管理**: TTL、キャッシュ戦略の実装

### 🌐 CDN Operations

- **ファイルアップロード**: テキスト、JSON、バイナリファイルの管理
- **ファイル読み取り**: 効率的なファイル取得
- **メタデータ管理**: ファイル情報とメタデータの処理
- **多形式サポート**: 様々なファイル形式への対応

### ⚡ Events System

- **リアルタイムイベント**: 即座のイベント配信
- **イベントタイプ**: 複数の用途別イベント管理
- **大容量ペイロード**: 大きなデータを含むイベント処理
- **ストリーミング**: 連続的なイベントストリーム

### 🆕 Request/Response Events

- `takos.events.request()` と `takos.events.onRequest()`
  により1対1の結果取得が可能

### 🧩 Extensions API

- **拡張機能間通信**: セキュアな機能間呼び出し
- **メタデータ管理**: 拡張機能情報の取得と管理
- **相互運用性**: 異なる拡張機能との連携
- **エクスポート機能**: 関数の公開と共有

### 🌍 Network Operations

- **HTTP/HTTPS**: 完全なHTTPクライアント機能
- **並列処理**: 複数の同時リクエスト処理
- **エラーハンドリング**: 堅牢なエラー処理と再試行
- **タイムアウト管理**: 適切なタイムアウト設定

### 🔒 Security Features

- **データサニタイゼーション**: XSS、SQLインジェクション対策
- **暗号化**: ハッシュ生成と検証
- **入力検証**: 包括的なバリデーション機能
- **セキュリティヘッダー**: 適切なセキュリティ設定

### 🏃 Performance Testing

- **CPU負荷テスト**: 計算集約的なタスクの性能測定
- **メモリ管理**: メモリ使用量の監視と最適化
- **並列処理**: 同時実行処理の性能評価
- **ベンチマーク**: 各機能の性能指標測定

## 🛠️ セットアップ

### 前提条件

- Deno 1.40.0以上
- Takos開発環境
- Node.js（UIビルド用）

### インストール

```bash
# プロジェクトディレクトリに移動
cd examples/comprehensive-api-demo

# 依存関係の確認（Deno）
deno check src/server/index.ts
deno check src/client/index.ts

# UIの確認
cd src/ui
npm install  # 必要に応じて
```

### ビルド

```bash
# プロジェクトルートから
deno run --allow-all ../../packages/builder/mod.ts build

# または、takopack CLIを使用
takopack build
```

### 実行

```bash
# 開発モード
deno run --allow-all ../../packages/builder/mod.ts dev

# または
takopack dev
```

## 📚 使用方法

### 1. 基本的なAPIテスト

各APIを個別にテストする場合：

```typescript
// サーバーサイドでのActivityPubテスト
import { activityPubFullDemo } from "./src/server/index.ts";

const result = await activityPubFullDemo();
console.log("ActivityPub Test Result:", result);
```

### 2. 包括的テスト

全ての機能を一度にテストする場合：

```typescript
import { comprehensiveApiTest } from "./src/server/index.ts";

const results = await comprehensiveApiTest();
console.log("Comprehensive Test Results:", results);
```

### 3. クライアントサイドテスト

Service Worker環境でのテスト：

```typescript
import { clientApiDemo } from "./src/client/index.ts";

const clientResults = await clientApiDemo();
console.log("Client Test Results:", clientResults);
```

### 4. UI統合テスト

Webブラウザ上でのインタラクティブテスト：

1. 拡張機能をビルド・インストール
2. ブラウザでTakosを開く
3. 拡張機能のUIを表示
4. 各テストボタンをクリック

## 🔧 設定

### takopack.config.ts

```typescript
export default defineConfig({
  manifest: {
    name: "Comprehensive Takos API Demo",
    identifier: "jp.takos.comprehensive-api-demo",
    version: "2.0.0",
    permissions: [
      // 全ての必要な権限を定義
      "activitypub:send",
      "activitypub:read",
      "kv:read",
      "kv:write",
      "cdn:read",
      "cdn:write",
      "events:publish",
      "extensions:invoke",
      "extensions:export",
      "fetch:net",
      // ... その他の権限
    ],
  },
});
```

## 📊 テスト結果の解釈

### 成功基準

- ✅ **success: true**: テストが正常に完了
- ⏱️ **duration**: 実行時間（ミリ秒）
- 📈 **metadata**: 追加の性能指標

### エラー処理

- ❌ **success: false**: テスト失敗
- 📝 **error**: エラーメッセージ
- 🔍 **data**: 部分的な結果データ

## 🎯 ベストプラクティス

### 1. エラーハンドリング

```typescript
try {
  const result = await takos.kv.set(key, value);
  return { success: true, data: result };
} catch (error) {
  console.error("KV operation failed:", error);
  return { success: false, error: error.message };
}
```

### 2. パフォーマンス監視

```typescript
const startTime = performance.now();
// API操作
const endTime = performance.now();
const duration = endTime - startTime;
```

### 3. データ検証

```typescript
// 入力データの検証
if (!data || typeof data !== "object") {
  throw new Error("Invalid data format");
}
```

## 🔍 トラブルシューティング

### よくある問題

**1. 権限エラー**

```
Error: Permission denied for operation 'kv:write'
```

解決策: `takopack.config.ts`で適切な権限を設定

**2. ネットワークエラー**

```
Error: Failed to fetch external resource
```

解決策: `fetch:net`権限の確認とネットワーク接続の確認

**3. メモリ不足**

```
Error: Exceeded memory limit
```

解決策: 大容量データ処理の最適化

### デバッグ方法

```typescript
// デバッグログの有効化
console.log("Debug info:", {
  timestamp: new Date().toISOString(),
  operation: "api-test",
  data: testData,
});
```

## 🤝 コントリビューション

### 新機能の追加

1. **新しいAPIテストの追加**:
   ```typescript
   export async function newApiDemo(): Promise<ApiTestResult> {
     // 新しいAPI機能のテスト実装
   }
   ```

2. **UIの改善**:
   - 新しいテストカードの追加
   - 視覚的な改善
   - アクセシビリティの向上

3. **ドキュメントの更新**:
   - README.mdの更新
   - コード内コメントの追加
   - API仕様の文書化

## 📜 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🔗 関連リンク

- [Takos公式サイト](https://takos.social)
- [Takopack仕様](../../docs/takopack/)
- [ActivityPub拡張](../../docs/activityPub/)
- [API仕様](../../docs/takos-web/)

## 📞 サポート

問題やバグを見つけた場合は、以下の方法でご報告ください：

- GitHub Issues
- Takosコミュニティフォーラム
- 開発者Discord

---

**作成者**: Takos Development Team\
**最終更新**: 2025年6月27日\
**バージョン**: 2.0.0

## 🏗️ クラスベースAPI アーキテクチャ

このプロジェクトは、最新のTakopack クラスベースAPIを使用して構築されています：

### 拡張機能クラス構造

```typescript
import {
  ClientExtension,
  ServerExtension,
  Takos,
  UIExtension,
} from "../../../packages/builder/src/classes.ts";

// 専用レイヤー拡張機能
const serverExtension = new ServerExtension();
const clientExtension = new ClientExtension();
const uiExtension = new UIExtension();

// クロスレイヤー拡張機能
const takosExtension = Takos.create();
```

### イベントハンドラー登録

```typescript
// サーバー専用イベント
serverExtension
  .server("activitypub:message", handleActivityPubMessage)
  .server("kv:update", handleKvDataUpdate)
  .server("cdn:upload", handleCdnFileUpload);

// クロスレイヤーイベント
takosExtension
  .server("server:ready", handleServerReady)
  .client("client:ready", handleClientReady)
  .ui("ui:ready", handleUIReady)
  .background("background:task", handleBackgroundTask);
```

### 拡張機能の利点

- **型安全性**: TypeScriptによる完全な型チェック
- **明確な責任分離**: レイヤー固有の機能と共通機能の分離
- **イベント駆動**: 効率的なクロスレイヤー通信
- **拡張性**: 新機能の追加が容易

## 🏗️ インスタンスベースアーキテクチャ

このプロジェクトは、関数のエクスポートではなく、**クラスインスタンスのみをエクスポート**する設計パターンを採用しています：

### エクスポート戦略

```typescript
// ❌ 関数をエクスポートしない
// export async function comprehensiveApiTest() { ... }

// ✅ インスタンスのみをエクスポート
export { serverExtension, takosExtension };
```

### 各レイヤーの構造

```typescript
// サーバーレイヤー (src/server/index.ts)
const serverExtension = new ServerExtension();
const takosExtension = Takos.create();

// イベントハンドラー登録
serverExtension.server("activitypub:message", handleActivityPubMessage);
takosExtension.server("server:ready", () => console.log("Server ready"));

// インスタンスのみエクスポート
export { serverExtension, takosExtension };
```

### メリット

- **明確な責任分離**: 機能は内部実装、インターフェースはインスタンスのみ
- **カプセル化**: 内部関数は外部に露出されない
- **型安全性**: クラスインスタンスによる強固な型チェック
- **保守性**: 変更時の影響範囲が限定される
- **拡張性**: 新機能追加時の既存コードへの影響が最小
