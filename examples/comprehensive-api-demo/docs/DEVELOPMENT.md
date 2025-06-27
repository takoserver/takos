# Development Guide - Comprehensive Takos API Demo

このガイドは、Comprehensive Takos API Demoプロジェクトの開発、拡張、およびカスタマイズに関する詳細な情報を提供します。

## 📋 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [プロジェクト構造](#プロジェクト構造)
- [開発ワークフロー](#開発ワークフロー)
- [新機能の追加](#新機能の追加)
- [テストの作成](#テストの作成)
- [デバッグ手法](#デバッグ手法)
- [パフォーマンス最適化](#パフォーマンス最適化)

## 🛠️ 開発環境のセットアップ

### 必要な技術スタック

```bash
# Deno（TypeScript/JavaScript ランタイム）
curl -fsSL https://deno.land/install.sh | sh

# Node.js（UIビルド用）
# https://nodejs.org からダウンロード

# Git（バージョン管理）
git --version
```

### プロジェクトのクローン

```bash
# Takosプロジェクトのクローン
git clone https://github.com/takos-social/takos.git
cd takos/examples/comprehensive-api-demo

# 依存関係の確認
deno check src/server/index.ts
deno check src/client/index.ts
```

### 開発用設定

#### VS Code拡張機能
```json
{
  "recommendations": [
    "denoland.vscode-deno",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag"
  ]
}
```

#### deno.jsonの設定
```json
{
  "tasks": {
    "dev": "deno run --allow-all --watch ../../packages/builder/mod.ts dev",
    "build": "deno run --allow-all ../../packages/builder/mod.ts build",
    "test": "deno test --allow-all tests/",
    "check": "deno check --remote src/server/index.ts src/client/index.ts",
    "lint": "deno lint src/",
    "fmt": "deno fmt src/"
  }
}
```

## 🏗️ プロジェクト構造

```
comprehensive-api-demo/
├── takopack.config.ts         # Takopack設定ファイル
├── deno.json                  # Deno設定ファイル  
├── README.md                  # プロジェクト概要
├── icon.png                   # 拡張機能アイコン
├── docs/                      # ドキュメント
│   ├── API_REFERENCE.md       # API仕様書
│   └── DEVELOPMENT.md         # 開発ガイド（このファイル）
├── src/                       # ソースコード
│   ├── server/                # サーバーサイド実装
│   │   └── index.ts           # サーバーAPIメイン
│   ├── client/                # クライアントサイド実装
│   │   └── index.ts           # クライアントAPIメイン
│   └── ui/                    # ユーザーインターフェース
│       ├── index.html         # 開発用HTML
│       └── dist/              # ビルド済みUI
│           └── index.html     # 本番用HTML
└── tests/                     # テストファイル（将来の拡張用）
```

### ファイル役割の詳細

#### `takopack.config.ts`
```typescript
// 拡張機能の設定とメタデータ
export default defineConfig({
  manifest: {
    name: "拡張機能名",
    identifier: "jp.takos.extension-id",
    permissions: ["必要な権限"],
    exports: ["エクスポートする関数"]
  },
  entries: {
    server: ["サーバーエントリーポイント"],
    client: ["クライアントエントリーポイント"],
    ui: ["UIエントリーポイント"]
  }
});
```

#### `src/server/index.ts`
- Deno環境で実行されるサーバーサイドロジック
- ActivityPub、KV、CDN、Events APIの実装
- 重い処理やデータベース操作に適している

#### `src/client/index.ts`
- Service Worker環境で実行されるクライアントサイドロジック
- バックグラウンド処理、キャッシュ管理、オフライン対応
- ブラウザの制約内での非同期処理に適している

#### `src/ui/dist/index.html`
- iframe内で実行されるユーザーインターフェース
- ユーザーとの直接的なインタラクション
- セキュアなサンドボックス環境

## 🔄 開発ワークフロー

### 1. 新機能開発の流れ

```bash
# 1. 機能ブランチの作成
git checkout -b feature/new-api-demo

# 2. 開発サーバーの起動
deno task dev

# 3. ファイルの編集
# - src/server/index.ts (サーバーサイド)
# - src/client/index.ts (クライアントサイド)  
# - src/ui/dist/index.html (UI)

# 4. リアルタイムテスト
# 開発サーバーが自動リロード

# 5. 型チェック
deno task check

# 6. フォーマット
deno task fmt

# 7. Lint
deno task lint

# 8. ビルド
deno task build

# 9. コミット
git add .
git commit -m "feat: add new API demo feature"
```

### 2. コーディング規約

#### TypeScript/JavaScript
```typescript
// ✅ 良い例
export async function newApiDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  
  try {
    // 具体的な処理
    const result = await someApiCall();
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      duration: performance.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: performance.now() - startTime
    };
  }
}
```

#### HTML/CSS
```html
<!-- ✅ 良い例 -->
<div class="demo-card">
  <h3>
    <span class="icon">🔧</span>
    New API Demo
  </h3>
  <p>Description of the new API functionality.</p>
  <button class="btn" onclick="testNewApi()">
    <span class="icon">🚀</span>
    Test New API
  </button>
</div>
```

### 3. エラーハンドリングパターン

```typescript
// 統一されたエラーハンドリング
async function apiFunction(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    // API操作
    console.log("🔧 [Category] Starting operation...");
    
    // 実際の処理
    const result = await performOperation();
    testData.operationResult = result;
    
    console.log("✅ [Category] Operation completed successfully");
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: performance.now() - startTime,
      metadata: {
        operationsPerformed: 1
      }
    };
    
  } catch (error) {
    console.error("❌ [Category] Operation failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: performance.now() - startTime,
      data: testData // 部分的な結果も返す
    };
  }
}
```

## ➕ 新機能の追加

### 1. 新しいAPIデモの追加

#### Step 1: サーバーサイド関数の作成

```typescript
// src/server/index.ts に追加

/**
 * 新しいAPIの全機能をデモンストレーション
 */
export async function newApiFullDemo(): Promise<ApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🔧 [New API] Starting new API demo...");
    
    // テスト 1: 基本機能
    const basicTest = await testBasicFeature();
    testData.basicTest = basicTest;
    
    // テスト 2: 応用機能
    const advancedTest = await testAdvancedFeature();
    testData.advancedTest = advancedTest;
    
    // テスト 3: エラーハンドリング
    const errorTest = await testErrorHandling();
    testData.errorTest = errorTest;
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      metadata: {
        testsPerformed: 3,
        apiVersion: "new-api-v1"
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [New API] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      data: testData
    };
  }
}

// ヘルパー関数
async function testBasicFeature() {
  // 基本機能のテスト実装
}

async function testAdvancedFeature() {
  // 応用機能のテスト実装
}

async function testErrorHandling() {
  // エラーハンドリングのテスト実装
}
```

#### Step 2: クライアントサイド関数の作成

```typescript
// src/client/index.ts に追加

export async function clientNewApiDemo(): Promise<ClientApiTestResult> {
  const startTime = performance.now();
  const testData: Record<string, any> = {};
  
  try {
    console.log("🔧 [Client New API] Starting client new API demo...");
    
    // クライアント特有のテスト
    const clientSpecificTest = await performClientSpecificOperation();
    testData.clientSpecificTest = clientSpecificTest;
    
    const endTime = performance.now();
    
    return {
      success: true,
      data: testData,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      environment: "client",
      metadata: {
        clientOperationsPerformed: 1
      }
    };
    
  } catch (error) {
    const endTime = performance.now();
    console.error("❌ [Client New API] Demo failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      environment: "client",
      data: testData
    };
  }
}
```

#### Step 3: UI要素の追加

```html
<!-- src/ui/dist/index.html に追加 -->

<!-- 新しいAPIデモカード -->
<div class="demo-card">
  <h3>
    <span class="icon">🔧</span>
    New API Demo
  </h3>
  <p>Test the new API functionality with comprehensive examples and real-world scenarios.</p>
  <button class="btn" onclick="testNewApi()">
    <span class="icon">🚀</span>
    Test New API
  </button>
  <div id="new-api-status" class="status-indicator" style="display: none;"></div>
  <div id="new-api-results" class="result-panel" style="display: none;"></div>
</div>
```

```javascript
// JavaScript関数の追加
async function testNewApi() {
  showStatus('new-api-status', 'Testing New API...', 'loading');
  
  try {
    const result = await callExtensionFunction('newApiFullDemo');
    testResults.newApi = result;
    
    if (result.success) {
      showStatus('new-api-status', 'New API tests completed successfully!', 'success');
    } else {
      showStatus('new-api-status', 'New API tests failed', 'error');
    }
    
    showResults('new-api-results', result);
    updateOverallStats();
    
  } catch (error) {
    showStatus('new-api-status', `New API test error: ${error.message}`, 'error');
    showResults('new-api-results', { error: error.message });
  }
}
```

#### Step 4: 設定ファイルの更新

```typescript
// takopack.config.ts の更新
export default defineConfig({
  manifest: {
    // ...既存の設定...
    exports: [
      // ...既存のエクスポート...
      "newApiFullDemo",
      "clientNewApiDemo",
      // ...
    ],
    permissions: [
      // ...既存の権限...
      "new-api:read",
      "new-api:write",
      // 必要に応じて新しい権限を追加
    ]
  }
});
```

### 2. 権限の管理

#### 新しい権限の追加

```typescript
// 権限の種類と用途
const permissions = [
  // 読み取り権限
  "new-api:read",          // データの読み取り
  "new-api:list",          // リスト取得
  
  // 書き込み権限  
  "new-api:write",         // データの書き込み
  "new-api:create",        // 新規作成
  "new-api:update",        // 更新
  "new-api:delete",        // 削除
  
  // 特殊権限
  "new-api:admin",         // 管理者操作
  "new-api:batch",         // バッチ処理
];
```

## 🧪 テストの作成

### 1. 単体テストの作成

```typescript
// tests/server_test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { activityPubFullDemo } from "../src/server/index.ts";

Deno.test("ActivityPub Full Demo", async () => {
  const result = await activityPubFullDemo();
  
  // 基本的な結果構造の確認
  assertExists(result);
  assertEquals(typeof result.success, "boolean");
  assertEquals(typeof result.timestamp, "string");
  
  // 成功時のデータ確認
  if (result.success) {
    assertExists(result.data);
    assertExists(result.duration);
  }
});
```

### 2. 統合テストの作成

```typescript
// tests/integration_test.ts
import { comprehensiveApiTest } from "../src/server/index.ts";

Deno.test("Comprehensive API Integration Test", async () => {
  const result = await comprehensiveApiTest();
  
  // 全体的なテスト結果の確認
  if (result.success) {
    // 各APIの結果を確認
    const { data } = result;
    
    // ActivityPub
    assertEquals(data.activitypub?.success, true);
    
    // Storage
    assertEquals(data.storage?.success, true);
    
    // Events
    assertEquals(data.events?.success, true);
    
    // その他のAPI...
  }
});
```

### 3. テストの実行

```bash
# 全テストの実行
deno task test

# 特定のテストファイルの実行
deno test tests/server_test.ts

# ウォッチモードでのテスト実行
deno test --watch tests/
```

## 🐛 デバッグ手法

### 1. ログ出力の活用

```typescript
// 構造化ログの例
function logOperation(operation: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    data,
    environment: "server" // or "client", "ui"
  };
  
  console.log(`[${operation}]`, JSON.stringify(logEntry, null, 2));
}

// 使用例
export async function debugApiCall() {
  logOperation("API_CALL_START", { endpoint: "/test" });
  
  try {
    const result = await performApiCall();
    logOperation("API_CALL_SUCCESS", { result });
    return result;
  } catch (error) {
    logOperation("API_CALL_ERROR", { error: error.message });
    throw error;
  }
}
```

### 2. パフォーマンス測定

```typescript
// 詳細なパフォーマンス測定
function createPerformanceTracker(operationName: string) {
  const startTime = performance.now();
  let lastCheckpoint = startTime;
  
  return {
    checkpoint(name: string) {
      const now = performance.now();
      console.log(`[${operationName}] ${name}: ${(now - lastCheckpoint).toFixed(2)}ms`);
      lastCheckpoint = now;
    },
    
    finish() {
      const totalTime = performance.now() - startTime;
      console.log(`[${operationName}] Total: ${totalTime.toFixed(2)}ms`);
      return totalTime;
    }
  };
}

// 使用例
export async function performanceDemoFunction() {
  const tracker = createPerformanceTracker("API_DEMO");
  
  tracker.checkpoint("START");
  
  const data = await prepareData();
  tracker.checkpoint("DATA_PREPARED");
  
  const result = await processData(data);
  tracker.checkpoint("DATA_PROCESSED");
  
  const finalResult = await saveResult(result);
  tracker.checkpoint("RESULT_SAVED");
  
  const totalTime = tracker.finish();
  
  return { finalResult, totalTime };
}
```

### 3. エラー詳細化

```typescript
// カスタムエラークラス
class TakosApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "TakosApiError";
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack
    };
  }
}

// エラーハンドリングの改善
async function improvedErrorHandling() {
  try {
    await riskyOperation();
  } catch (error) {
    if (error instanceof TakosApiError) {
      // 既知のエラー
      console.error("Known API Error:", error.toJSON());
    } else {
      // 未知のエラー
      console.error("Unknown Error:", {
        message: error.message,
        stack: error.stack,
        type: typeof error
      });
    }
    throw error;
  }
}
```

## ⚡ パフォーマンス最適化

### 1. メモリ管理

```typescript
// 大容量データの効率的な処理
async function optimizedLargeDataProcessing() {
  const BATCH_SIZE = 1000;
  const results = [];
  
  // バッチ処理でメモリ使用量を制御
  for (let i = 0; i < largeDataSet.length; i += BATCH_SIZE) {
    const batch = largeDataSet.slice(i, i + BATCH_SIZE);
    const batchResult = await processBatch(batch);
    results.push(...batchResult);
    
    // バッチ間でメモリをクリーンアップ
    if (i % (BATCH_SIZE * 10) === 0) {
      // 必要に応じてガベージコレクションを促進
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
  
  return results;
}
```

### 2. 並列処理の最適化

```typescript
// 効率的な並列処理
async function optimizedParallelProcessing() {
  const MAX_CONCURRENT = 5;
  const tasks = createTasks();
  const results = [];
  
  // セマフォパターンで同時実行数を制御
  const semaphore = new Array(MAX_CONCURRENT).fill(null);
  
  const executeTask = async (task: any) => {
    const slot = await Promise.race(semaphore.map((_, i) => i));
    semaphore[slot] = task();
    
    try {
      const result = await semaphore[slot];
      return result;
    } finally {
      semaphore[slot] = null;
    }
  };
  
  const allResults = await Promise.all(tasks.map(executeTask));
  return allResults;
}
```

### 3. キャッシュ戦略

```typescript
// インメモリキャッシュの実装
class PerformanceCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分
  
  set(key: string, data: any, ttl = this.TTL) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
  
  get(key: string) {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

const performanceCache = new PerformanceCache();

// キャッシュを使用した最適化された関数
async function cachedApiCall(params: any) {
  const cacheKey = JSON.stringify(params);
  const cached = performanceCache.get(cacheKey);
  
  if (cached) {
    console.log("Cache hit for:", cacheKey);
    return cached;
  }
  
  console.log("Cache miss for:", cacheKey);
  const result = await expensiveApiCall(params);
  
  performanceCache.set(cacheKey, result);
  return result;
}
```

## 🚀 本番環境への展開

### 1. ビルドの最適化

```bash
# 本番用ビルド
deno task build

# ビルド結果の確認
ls -la dist/

# パフォーマンス測定
deno run --allow-all benchmark.ts
```

### 2. セキュリティチェック

```typescript
// セキュリティ監査機能
export function securityAudit() {
  const checks = [
    checkPermissions(),
    checkDataSanitization(),
    checkNetworkSecurity(),
    checkStorageSecurity()
  ];
  
  return Promise.all(checks);
}

function checkPermissions() {
  // 権限の過剰付与をチェック
}

function checkDataSanitization() {
  // データサニタイゼーションの実装をチェック
}
```

---

このガイドを参考に、安全で効率的なTakopack拡張機能を開発してください。質問や改善提案があれば、コミュニティフォーラムやGitHub Issuesでお気軽にご相談ください。
