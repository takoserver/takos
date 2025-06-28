# 🎯 Takopack 3.1 - Events API 移行レポート

## 📋 移行内容

Takopack 3.1 ではイベントの登録・発火を `takos.events` API に統一しました。以前のクラスベース API はレガシーサポートのみとなり、example プロジェクトもすべて新方式へ移行しています。

## ✅ 移行完了済みプロジェクト

### 1. `examples/api-test`

**変更前 (クラスベース API)**
```typescript
import { Takos } from "@takopack/builder";

export const takos = new Takos();

takos.client("serverToClient", () => {
  return { ok: true };
});
```

**変更後 (`takos.events` API)**
```typescript
takos.events.onRequest("serverToClient", () => {
  return { ok: true };
});
```

### 2. `examples/layer-communication-test`

同様にクラスベース API から `takos.events` API へ移行しました。

## 🚀 新しい API のポイント

- `takos.events.onRequest()` でイベントハンドラーを登録
- `takos.events.request()` でイベント送信とレスポンス受信

## ❌ 廃止された記法

JSDoc やデコレータ方式、クラスベースのイベント登録は利用できません。

```typescript
// もう使えない例
export function handler() {}
export const takos = new Takos();
takos.client("eventName", handler);
```

## 🎯 まとめ

全ての example が `takos.events` API を利用する形に統一されました。これによりシンプルかつ柔軟なイベント実装が可能となっています。
