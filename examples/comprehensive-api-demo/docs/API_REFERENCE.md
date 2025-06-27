# API Reference - Comprehensive Takos API Demo

このドキュメントは、Comprehensive Takos API Demoプロジェクトで実装されている全ての関数とAPIの詳細な説明を提供します。

## 📋 目次

- [Server API Functions](#server-api-functions)
- [Client API Functions](#client-api-functions)
- [UI Integration](#ui-integration)
- [Event Handlers](#event-handlers)
- [Utility Functions](#utility-functions)

## 🖥️ Server API Functions

### `comprehensiveApiTest(): Promise<ApiTestResult>`

全てのTakos APIを順番にテストし、結果を返すメイン関数。

**戻り値**: 
```typescript
interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}
```

**使用例**:
```typescript
const result = await comprehensiveApiTest();
console.log('Test completed:', result.success);
console.log('Duration:', result.duration, 'ms');
```

---

### `activityPubFullDemo(): Promise<ApiTestResult>`

ActivityPubの全機能をデモンストレーション。

**機能**:
- 現在のユーザー取得
- Note投稿作成
- Actor情報読み取り
- カスタムActivityPubオブジェクト作成

**使用例**:
```typescript
const result = await activityPubFullDemo();
if (result.success) {
  console.log('Note created:', result.data.noteResult);
  console.log('Actor data:', result.data.actorData);
}
```

---

### `storageFullDemo(): Promise<ApiTestResult>`

KVストレージの全機能をデモンストレーション。

**機能**:
- 基本的な読み書き操作
- 複数キーの管理
- 大容量データ処理
- TTL設定（対応している場合）

**使用例**:
```typescript
const result = await storageFullDemo();
console.log('Keys created:', result.metadata.keysCreated);
console.log('Large data size:', result.metadata.largeDataSize);
```

---

### `cdnFullDemo(): Promise<ApiTestResult>`

CDNファイル操作の全機能をデモンストレーション。

**機能**:
- テキストファイルのアップロード・ダウンロード
- JSONファイルの処理
- バイナリデータの管理

**使用例**:
```typescript
const result = await cdnFullDemo();
console.log('Files created:', result.metadata.filesCreated);
console.log('Total data size:', result.metadata.totalDataSize);
```

---

### `eventsFullDemo(): Promise<ApiTestResult>`

イベント配信システムの全機能をデモンストレーション。

**機能**:
- 基本的なイベント配信
- 複数イベントタイプの処理
- 大容量ペイロードのイベント
- ストリーミングイベント

**使用例**:
```typescript
const result = await eventsFullDemo();
console.log('Events published:', result.metadata.eventsPublished);
```

---

### `extensionsFullDemo(): Promise<ApiTestResult>`

拡張機能間通信の全機能をデモンストレーション。

**機能**:
- 自己拡張機能情報の取得
- 他拡張機能の呼び出し（テスト）
- エクスポート機能のテスト
- 相互運用性テスト

**使用例**:
```typescript
const result = await extensionsFullDemo();
console.log('Extension ID:', result.data.selfInfo.identifier);
```

---

### `networkingFullDemo(): Promise<ApiTestResult>`

ネットワーク操作の全機能をデモンストレーション。

**機能**:
- HTTP GETリクエスト
- HTTP POSTリクエスト
- 並列リクエスト処理
- エラーハンドリング
- タイムアウト管理

**使用例**:
```typescript
const result = await networkingFullDemo();
console.log('Requests performed:', result.metadata.requestsPerformed);
console.log('Network online:', result.metadata.networkOnline);
```

---

### `securityFullDemo(): Promise<ApiTestResult>`

セキュリティ機能のデモンストレーション。

**機能**:
- データサニタイゼーション
- ハッシュ生成
- ランダムデータ生成
- 入力検証
- セキュリティヘッダー設定

**使用例**:
```typescript
const result = await securityFullDemo();
console.log('Security tests:', result.metadata.testsPerformed);
```

---

### `performanceTest(): Promise<ApiTestResult>`

システムパフォーマンスのテスト。

**機能**:
- CPU集約的タスクの測定
- 大量データ処理の性能測定
- JSON シリアライゼーション性能
- 並列処理性能

**使用例**:
```typescript
const result = await performanceTest();
console.log('Performance scores:', result.metadata.performanceScores);
```

## 📱 Client API Functions

### `clientApiDemo(): Promise<ClientApiTestResult>`

全てのクライアントサイドAPIを順番にテスト。

**環境**: Service Worker

**機能**:
- クライアントストレージテスト
- イベント処理テスト
- ネットワーク操作テスト
- バックグラウンド処理テスト
- キャッシュ管理テスト

**使用例**:
```typescript
const result = await clientApiDemo();
console.log('Client tests completed:', result.success);
console.log('Environment:', result.environment); // "client"
```

---

### `clientStorageDemo(): Promise<ClientApiTestResult>`

Service Worker環境でのKVストレージ操作。

**機能**:
- セッションデータ管理
- 設定データ保存
- キャッシュデータ管理
- ストレージ使用量推定

---

### `clientEventsDemo(): Promise<ClientApiTestResult>`

Service Worker環境でのイベント処理。

**機能**:
- クライアント生成イベント
- バックグラウンドイベント
- Service Worker通信イベント

---

### `clientNetworkDemo(): Promise<ClientApiTestResult>`

Service Worker環境でのネットワーク操作。

**機能**:
- 基本的なHTTPリクエスト
- POST リクエスト
- 並列リクエスト
- ネットワーク状態確認

---

### `clientBackgroundDemo(): Promise<ClientApiTestResult>`

Service Workerでのバックグラウンド処理。

**機能**:
- 計算処理タスク
- データ処理タスク
- 定期的なバックグラウンドタスク

---

### `clientCacheDemo(): Promise<ClientApiTestResult>`

Service Workerでのキャッシュ管理。

**機能**:
- キャッシュエントリ作成
- キャッシュヒット/ミステスト
- キャッシュ無効化（LRU）
- キャッシュ統計収集

## 🎨 UI Integration

### JavaScript Functions

UIレイヤーで使用される主要なJavaScript関数：

#### `callExtensionFunction(functionName, ...args)`

Takos拡張機能の関数を呼び出し。

**パラメータ**:
- `functionName`: 呼び出す関数名
- `...args`: 関数に渡す引数

**戻り値**: Promise<ApiTestResult>

#### `showStatus(elementId, message, type)`

UI要素にステータスを表示。

**パラメータ**:
- `elementId`: 表示対象のHTML要素ID
- `message`: 表示メッセージ
- `type`: 'loading' | 'success' | 'error'

#### `updateOverallStats()`

全体的な統計情報をUIに更新。

### HTML API Demo Controls

各APIテスト用のHTML要素とイベントハンドラー：

```html
<button class="btn" onclick="testActivityPub()">
  Test ActivityPub
</button>
```

対応する関数:
- `testActivityPub()`
- `testStorage()`
- `testCDN()`
- `testEvents()`
- `testExtensions()`
- `testNetworking()`
- `testSecurity()`
- `testPerformance()`

## 🎯 Event Handlers

### `onActivityPubReceive(activity: any)`

ActivityPub受信イベントハンドラー。

**パラメータ**:
- `activity`: 受信したActivityPubアクティビティ

**処理内容**:
- Note作成の検出
- イベント再配信
- 処理結果の返却

---

### `onStorageChange(event: any)`

ストレージ変更イベントハンドラー。

---

### `onEventReceived(eventData: any)`

汎用イベント受信ハンドラー。

---

### `onExtensionInvoke(params: any)`

拡張機能呼び出しハンドラー。

## 🛠️ Utility Functions

### Legacy Compatibility Functions

既存コードとの互換性のための関数：

- `apiTestServer(testType, params?)`: レガシーサーバーテスト関数
- `testActivityPubSend()`: 基本的なActivityPubテスト
- `testKVStorage()`: 基本的なKVストレージテスト
- `testCDNOperations()`: 基本的なCDN操作テスト
- `testEvents()`: 基本的なイベントテスト
- `testExtensions()`: 基本的な拡張機能テスト

### Client Test Handlers

クライアント側のテストハンドラー：

- `testClientKV(key, value)`: クライアントKVテスト
- `testClientEvents(eventType, eventData)`: クライアントイベントテスト
- `testClientFetch(url, options?)`: クライアントfetchテスト

## 🔧 Configuration

### Interface Definitions

```typescript
interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface ClientApiTestResult extends ApiTestResult {
  environment: "client";
}

interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: number;
  operation: string;
}
```

### Error Handling

全ての関数は一貫したエラーハンドリングパターンを使用：

```typescript
try {
  // API操作
  return {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
    duration: endTime - startTime
  };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    duration: endTime - startTime
  };
}
```

## 📊 Performance Considerations

### Optimization Tips

1. **メモリ使用量の監視**:
   ```typescript
   const memoryUsage = performance.memory ? {
     used: performance.memory.usedJSHeapSize,
     total: performance.memory.totalJSHeapSize
   } : null;
   ```

2. **並列処理の活用**:
   ```typescript
   const results = await Promise.all(tasks.map(task => task()));
   ```

3. **適切なエラーハンドリング**:
   ```typescript
   const timeoutController = new AbortController();
   const timeoutId = setTimeout(() => timeoutController.abort(), 5000);
   ```

## 🚀 Best Practices

### Code Organization

- **関数の分離**: 各API機能を独立した関数として実装
- **エラーハンドリング**: 一貫したエラー処理パターンの使用
- **型安全性**: TypeScriptインターフェースの活用
- **ドキュメント**: 詳細なコメントとドキュメント

### Testing Strategy

- **段階的テスト**: 個別機能から包括的テストへの段階的アプローチ
- **環境分離**: Server、Client、UI各環境での独立したテスト
- **パフォーマンス測定**: 各操作の実行時間とリソース使用量の測定

---

このAPIリファレンスは、Comprehensive Takos API Demoプロジェクトの完全な技術仕様を提供します。各関数の詳細な実装については、ソースコードをご参照ください。
