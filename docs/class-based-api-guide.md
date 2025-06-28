# 📝 Takopack 3.0 簡易クラスベースAPI ガイド

> **⚠️ 本ドキュメントはレガシー仕様の参考用です**

## 概要

Takopack 3.0 ではクラスベースAPIを使用してイベントを登録していました。
現在は `takos.events` API を利用する方式に完全移行しています。以下は旧式の参考情報です。

## 基本的な使用方法

### 1. 基本パターン

```typescript
import { Takos } from "../../../../packages/builder/src/classes.ts";

// Takosインスタンスを作成
export const takos = new Takos();

// イベントを直接登録（関数は個別にexportしない）
takos.client("eventName", (payload: unknown) => {
  console.log("Received:", payload);
  return { success: true };
});
```

### 2. 各レイヤーでの実装例

#### Client レイヤー (`src/client/events.ts`)

```typescript
import { Takos } from "../../../../packages/builder/src/classes.ts";

export const clientTakos = new Takos();

clientTakos.client("uiToClient", (payload: unknown) => {
  // UI からのイベント処理
  return { received: true, timestamp: new Date().toISOString() };
});

clientTakos.client("serverToClient", (payload: unknown) => {
  // Server からのイベント処理
  return { received: true, processedBy: "client" };
});
```

#### Server レイヤー (`src/server/events.ts`)

```typescript
import { Takos } from "../../../../packages/builder/src/classes.ts";

export const serverTakos = new Takos();

serverTakos.server("clientToServer", (payload: unknown) => {
  // Client からのイベント処理
  return { success: true, processedBy: "server" };
});

serverTakos.server("uiToServer", (payload: unknown) => {
  // UI からのイベント処理
  return { received: true, timestamp: new Date().toISOString() };
});
```

## 重要なポイント

### ✅ 推奨される書き方

- クラスインスタンスを`export`する
- イベントハンドラーは匿名関数またはアロー関数で直接登録
- 個別のハンドラー関数は`export`しない

### ❌ 廃止された書き方

```typescript
// ❌ JSDoc方式 (もう使えません)
/**
 * @event myEvent
 */
export function myHandler() {}

// ❌ デコレータ方式 (もう使えません)

export function myHandler() {}

// ❌ 個別ハンドラーのexport (推奨しません)
export function myHandler() {}
export const takos = new Takos();
takos.client("myEvent", myHandler);
```

## 利点

1. **シンプル**: クラスインスタンス1つだけをexportするだけ
2. **型安全**: TypeScriptの型推論が働く
3. **一貫性**: すべてのレイヤーで同じAPI
4. **保守性**: イベント定義と実装が同じ場所にある

## manifest.json生成

v3では `eventDefinitions` フィールドが廃止されました。このAPIを利用すると、
ビルド時にイベントハンドラーが自動的に公開されます。

クラスベースAPIが見つからない場合、ビルドは失敗し、適切なエラーメッセージが表示されます。
