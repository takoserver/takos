# 🐙 Takopack API仕様 v3

この文書では拡張機能から利用できる globalThis.takos API を説明します。

## APIと権限

主要 API のメソッドシグネチャと必要権限は以下の通りです。

### ActivityPub

-#### オブジェクト操作

- **currentUser**: `takos.ap.currentUser(): Promise<string>`
  - **必要権限**: なし
- **send**: `takos.ap.send(activity: object): Promise<void>`
  - **必要権限**: `activitypub:send`
- **read**: `takos.ap.read(id: string): Promise<object>`
  - **必要権限**: `activitypub:read`
- **delete**: `takos.ap.delete(id: string): Promise<void>`
  - **必要権限**: `activitypub:send`
- **list**: `takos.ap.list(): Promise<string[]>`
  - **必要権限**: `activitypub:read`
  - **利用可能レイヤー**: `server` のみ

#### フック処理

- ActivityPub オブジェクト受信時のフック (`hook`)
  - **必要権限**: `activitypub:receive:hook`

#### アクター操作

- **read**: `takos.ap.actor.read(): Promise<object>`
- **update**: `takos.ap.actor.update(key: string, value: string): Promise<void>`
- **delete**: `takos.ap.actor.delete(key: string): Promise<void>`
- **follow**:
  `takos.ap.follow(followerId: string, followeeId: string): Promise<void>`
- **unfollow**:
  `takos.ap.unfollow(followerId: string, followeeId: string): Promise<void>`
- **listFollowers**:
  `takos.ap.listFollowers(actorId: string): Promise<string[]>`
- **listFollowing**:
  `takos.ap.listFollowing(actorId: string): Promise<string[]>`
  - **必要権限**: `activitypub:actor:read` / `activitypub:actor:write`

### プラグインアクター操作

- **create**:
  `takos.ap.pluginActor.create(localName: string, profile: object): Promise<string>`
- **read**: `takos.ap.pluginActor.read(iri: string): Promise<object>`
- **update**:
  `takos.ap.pluginActor.update(iri: string, partial: object): Promise<void>`
- **delete**: `takos.ap.pluginActor.delete(iri: string): Promise<void>`
- **list**: `takos.ap.pluginActor.list(): Promise<string[]>`
  - **必要権限**: `plugin-actor:create` / `plugin-actor:read` /
    `plugin-actor:write` / `plugin-actor:delete`

### kv

- **read**: `takos.kv.read(key: string): Promise<any>`
- **write**: `takos.kv.write(key: string, value: any): Promise<void>`
- **delete**: `takos.kv.delete(key: string): Promise<void>`
- **list**: `takos.kv.list(): Promise<string[]>`
  - **必要権限**: `kv:read` / `kv:write`
  - `server.js` と `client.js` / `index.html` のストレージは独立
  - クライアント側では IndexedDB
    を利用したストアが使われ、サーバーとは同期されません

### fetch

- **fetch**: `takos.fetch(url: string, options?: object): Promise<Response>`
  - **必要権限**: `fetch:net` (クライアントでは `client.allowedConnectSrc`
    設定が必要)
  - `deno:net` 権限は不要です。サンドボックス内では `fetch()` が自動的に
    `takos.fetch()` へマップされます。

### cdn

- **read**: `takos.cdn.read(path: string): Promise<string>`
- **write**:
  `takos.cdn.write(path: string, data: string | Uint8Array, options?: { cacheTTL?: number }): Promise<string>`
- **delete**: `takos.cdn.delete(path: string): Promise<void>`
- **list**: `takos.cdn.list(prefix?: string): Promise<string[]>`
  - **必要権限**: `cdn:read` / `cdn:write`
  - **制限**: 合計 20MB まで。エンドポイント `/cdn/<identifier>/<path>`
  - **利用可能レイヤー**: `server` のみ

### events

manifest でのイベント宣言は廃止されました。すべてのレイヤーから次の API
を利用できます。

- `takos.events.request(name: string, payload?: any, opts?: { timeout?: number }): Promise<unknown>`
- `takos.events.onRequest(name: string, handler: (payload: any) => unknown): () => void`
  - `request()` は 1 対 1 で呼び出し、`onRequest()`
    で登録したハンドラーの戻り値を取得します。
  - `options.push` を `true` にすると、クライアントがオフラインでも FCM などの
    Push 通知経由でイベントを配信できます。`options.token`
    にはデバイスのトークンを指定してください。
  - FCM のデータペイロード上限は約 4KB です。これを超えるとエラーになります。
  - ハンドラーは登録されたレイヤーで実行されます。

### 拡張間 API

- `takos.extensions.get(identifier: string): Extension | undefined`
- `Extension.activate(): Promise<{ publish(name: string, payload?: unknown): Promise<unknown> }>`
- `takos.activateExtension(identifier: string): Promise<{ publish(name: string, payload?: unknown): Promise<unknown> } | undefined>`
  - **必要権限**: `extensions:invoke` / `extensions:export`

権限はすべて `manifest.permissions` に列挙し、必要最低限を宣言してください。

---

## globalThis.takos API

Takos の各 API は `globalThis` 上の `takos` オブジェクトとして公開されます。
そのため、各スクリプトの冒頭で次のように取得して利用します。

```javascript
const { takos } = globalThis;
```

### 主なプロパティ

下表のように `takos` には拡張機能開発向けの API
群が集約されています。詳細なメソッドは[APIと権限](#apiと権限)を参照してください。

| プロパティ           | 役割                                                   |
| -------------------- | ------------------------------------------------------ |
| `ap` / `activitypub` | ActivityPub 連携用の API。投稿送信やアクター操作を行う |
| `kv`                 | 拡張ごとのキー/値ストア操作                            |
| `cdn`                | CDN へのファイル保存・取得                             |
| `events`             | レイヤー間イベントの発行・購読                         |
| `extensions`         | 他拡張の取得と `activate()` 実行                       |
| `activateExtension`  | ID 指定で拡張の `activate()` を実行                    |
| `fetch`              | 権限制御付きの `fetch` ラッパー                        |

```typescript
namespace takos.extensions {
  function get(identifier: string): Extension | undefined;
  const all: Extension[];
}
interface Extension {
  identifier: string;
  version: string;
  isActive: boolean;
  activate(): Promise<{
    publish(name: string, payload?: unknown): Promise<unknown>;
  }>;
}
function activateExtension(
  identifier: string,
): Promise<{ publish(name: string, payload?: unknown): Promise<unknown> }>;
```

利用例:

```javascript
// 従来の取得方法
const ext = takos.extensions.get("com.example.lib");
if (ext) {
  const api = await ext.activate();
  const hash = await api.publish("calculateHash", "hello");
}

// 直接有効化する方法
const api2 = await takos.activateExtension("com.example.lib");
if (api2) {
  const hash2 = await api2.publish("calculateHash", "world");
}
```

その他の API も `takos.*` 名前空間に集約されています。 ActivityPub API は
`takos.activitypub` のほか、短縮形の `takos.ap` からも利用できます。

### レイヤー別 API 利用可否

以下の表は、主要 API を各レイヤーから利用できるかを示します。

| API                                                         | server.js | client.js (background) | index.html (UI) |
| ----------------------------------------------------------- | --------- | ---------------------- | --------------- |
| `fetch`                                                     | ✓         | ✓                      | ✓               |
| `kv`                                                        | ✓         | ✓                      | ✓               |
| `cdn`                                                       | ✓         | ―                      | ―               |
| `events`                                                    | ✓         | ✓                      | ✓               |
| `activitypub`                                               | ✓         | ―                      | ―               |
| `extensions` / `activateExtension`                          | ✓         | ✓                      | ✓               |
| UI URL helpers (`getURL`, `pushURL`, `setURL`, `changeURL`) | ―         | ―                      | ✓               |

---

## ActivityPub フック

`activityPub.objects` に指定したオブジェクトを受信すると、`hook` に
登録した関数が呼び出されます。これらの API はサーバーレイヤー専用です。
利用可能なレイヤーについては[レイヤー別 API 利用可否](#レイヤー別-api-利用可否)を参照してください。

```javascript
const afterA = await PackA.onReceive(obj);
const afterB = await PackB.onReceive(afterA);
```

---

---

## v2.1からの移行ガイド

1. 権限宣言を `manifest.permissions` に集約。
2. manifest から `eventDefinitions` を削除し、`takos.events.onRequest()`
   でハンドラー登録。
3. ActivityPub API は `activityPub()` に統合。
4. `extensionDependencies` と `exports` を利用し、`takos.extensions` API
   で他拡張と連携。

---

## Sandbox 実行環境

- すべてのレイヤーはサンドボックスで分離されます。
- `activate()` の戻り値は structuredClone 準拠でシリアライズ。
- 呼び出し権限は export 元の範囲に限定され、依存循環はエラーとなります。

---

## 拡張機能間API連携

### 記述方法

- `extensionDependencies` で依存 Pack を宣言し、未インストール時は UI で通知。
- `exports` には公開するイベント名を列挙します。

### 権限制御

- `extensions:export` 他拡張へ API を公開する権限。
- `extensions:invoke` 他拡張の API を取得する権限。

### 利用方法

```javascript
const ext = takos.extensions.get("com.example.lib");
if (ext) {
  const api = await ext.activate();
  await api.publish("doSomething");
}
```

TypeScript で型安全に連携でき、npm-semver 準拠で依存解決されます。

## UI URL操作

UI レイヤーで画面遷移を制御するための API
です。サーバーやバックグラウンドからは利用できません。
利用できるレイヤーの一覧は[レイヤー別 API 利用可否](#レイヤー別-api-利用可否)も参照してください。

- **getURL**: `takos.getURL(): string[]`
  - 現在の URL パスを配列で取得します。
- **pushURL**:
  `takos.pushURL(segment: string, options?: { showBar?: boolean }): void`
  - `segment` を末尾に追加して遷移します。
- **setURL**:
  `takos.setURL(segments: string[], options?: { showBar?: boolean }): void`
  - URL 全体を配列で指定して遷移します。
- **changeURL**:
  `takos.changeURL(listener: (e: { url: string[] }) => void): () => void`
  - URL 変更時に `listener` を呼び出します。戻り値は解除関数です。

**必要権限**: なし (UI レイヤーのみ使用可)
