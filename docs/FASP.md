# takos × Fediscovery（FASP）統合・Service Actor実装 仕様案

## 0. 目的と範囲

- **目的**

  - takos に Fediscovery（FASP）を接続し、検索・発見（Discovery）機能を強化。
  - takos host に **Service Actor**
    を実装し、従来のリレーサーバー代替として「フォロー可能な配信ハブ」を提供。
  - takos host が従来提供していたリレーサーバー機能を廃止し、Service Actor
    配信へ移行（外部リレーへの参加機能は維持）。

- **スコープ**

  - FASP **General**（登録・認証・プロバイダ情報・capability選択）の実装。
  - FASP **Discovery**のうち **data\_sharing** / **trends** /
    **account\_search** 対応。
  - takos host の **Service
    Actor**（ActivityStreamsの`Service`/`Application`）を公開し、**フォロー/Accept/配信**を行う。
  - 詳細仕様は `docs/fasp/general/v0.1/` および `docs/fasp/discovery/` を参照。

---

## 1. 用語

- **FASP**: Fediverse Auxiliary Service
  Provider。外部の補助サービス（検索、スパム対策など）。
- **Capability**: FASPが提供する機能単位（例：`data_sharing`, `trends`,
  `account_search`, `debug`）。
- **Service Actor**:
  ActivityStreamsのActor型の一つ。サーバ側ソフトやボット等に用いられる。takos
  hostでは**フォロー可能なサービス用Actor**として公開する。 ([W3C][1])

---

## 2. 全体アーキテクチャ

- **構成要素**

  - **takos Core**：既存アプリケーション。
  - **takos FASP-Adapter**：FASP
    General実装（登録・認証・プロバイダ情報取得・capability管理）。
  - **takos Discovery
    Module**：`data_sharing`（サブスクリプション受理・バックフィル対応・アナウンス送信）、`trends`
    / `account_search`（FASP検索APIクライアント）。
  - **takos Service Actor**：`https://{takos-host}/actor`
    に公開。inbox/outbox、公開鍵、フォロー受付、配信制御。
  - **FASP（Discovery Provider）**：外部サービス。

- **ベースURLの取り決め**

  - takos は `.well-known/nodeinfo` の `metadata.faspBaseUrl` に takos
    側FASPサーバAPIのベースURLを掲載。例：`"faspBaseUrl": "https://{takos-host}/fasp"`。

---

## 3. セキュリティ / 認証

- **メッセージ完全性**

  - すべてのリクエストに `Content-Digest`（RFC 9530,
    SHA-256）を付与。受信側は検証必須。
- **相互認証**

  - **HTTP Message Signatures（RFC 9421）**、アルゴリズム **ed25519**
    を使用。`@method`,`@target-uri`,`content-digest`
    をカバー。レスポンス署名では `@status` を使用。`keyid`
    は登録時に交換したID。
- **ダブルノッキング（取得系互換性）**

  - FASP/Service Actor が外部のAPサーバからオブジェクト取得を行う場合、まず RFC
    9421 で試行し、401/403なら旧 **draft-cavage HTTP Signatures**
    で再試行（互換性確保）。実装はサーバごとに結果をキャッシュ。
- **レート制限**

  - 429 + `Retry-After` を使用。クライアントは尊重する。

---

## 4. FASP General 実装

### 4.1 登録フロー（FASP ↔ takos）

1. 管理者がFASP上でtakosを登録（FASPが takos の `.well-known/nodeinfo`
   を参照して `faspBaseUrl` を把握）。
2. FASP → takos：`POST /registration`

   ```json
   {
     "name": "Example FASP",
     "baseUrl": "https://fasp.example.com",
     "serverId": "b2ks…",
     "publicKey": "Base64-Ed25519-PubKey"
   }
   ```

   takosは FASP登録要求を保存し、自身の公開鍵と
   `faspId`、`registrationCompletionUri` を返す。
3. 管理者は takos 管理UIで**指紋（FASP公開鍵のSHA-256
   Base64）**を確認し、受理/拒否を決定。
4. 受理後、能力（capability）選択へ。

### 4.2 Capability 選択

- takos → FASP：`GET /provider_info` で capabilities を取得し、管理UIでON/OFF。
- ON時：takos →
  FASP：`POST /capabilities/<identifier>/<version>/activation`。OFF時：`DELETE`。

### 4.3 管理UI

- `/admin/fasps` 画面で FASP 基本設定（有効化・Base URL・提供 capability
  のバージョン）を編集できる。
- 登録済みFASPの一覧と公開鍵指紋を表示し、指紋を確認して「承認」を押すと
  capability 選択が有効になる。
- 各 capability には ON/OFF スイッチがあり、切り替え操作に応じて `POST` または
  `DELETE /capabilities/<identifier>/<version>/activation` を送信する。

---

## 5. Discovery Capabilities 実装

### 5.1 `data_sharing v0.1`

**役割分担**

- **FASP ⇒ takos（受信）**

  - `POST /data_sharing/v0/event_subscriptions`

    - body:
      `{category: "content"|"account", subscriptionType: "lifecycle"|"trends", maxBatchSize?, threshold?}`
    - 201で `{"subscription": {"id": "…" }}` を返す。
  - `POST /data_sharing/v0/backfill_requests`（ヒストリ取得要求）

    - body: `{category, maxCount}` → 201で `{"backfillRequest":{"id":"…"}}`。
  - `POST /data_sharing/v0/backfill_requests/{id}/continuation`（more
    指示に応じて）→ 204/404。
  - `DELETE /data_sharing/v0/event_subscriptions/{id}` → 204。

- **takos ⇒ FASP（送信）**

  - **アナウンス**：`POST {FASP}/data_sharing/v0/announcements`

    - body:

      ```json
      {
        "source": { "subscription": { "id": "…" } | "backfillRequest": { "id": "…" } },
        "category": "content" | "account",
        "eventType": "new" | "update" | "delete" | "trending",
        "objectUris": ["https://…", "https://…"],
        "moreObjectsAvailable": true|false  // backfill時
      }
      ```
    - 204 を期待。

**制約**

- 送信は **URIのみ**（本体は送らない）。FASP側が取得する。
- takos は
  **公開・検索許可（discoverable）**のみ共有。**非公開・未許可**は共有禁止。
- FASP側は `to:` を確認し公開対象のみ処理。
- 検索許可の判定は **FEP-5feb** に従う。

**FASPによる取得（参照）**

- FASPは受け取ったURIに対し
  `Accept: application/ld+json; profile="https://www.w3.org/ns/activitystreams"`
  でGET。
- 署名は RFC 9421（必要に応じ
  cavage-12）で、**FASPは「サーバ/インスタンスActor」として署名**（`/actor`に公開鍵）。

### 5.2 `trends v0.1`（takos ⇒ FASP）

- **エンドポイント例**（FASP側）

  - `GET /trends/v0/content?withinLastHours=1..168&maxCount&language`
  - `GET /trends/v0/hashtags?...` /
    `GET /trends/v0/links?...`（同様の共通パラメータ）
- **応答**

  - `content`: `[{uri, rank}]`（`rank`は1..100、降順）。
  - ハッシュタグ/リンクは正規化はFASP側裁量、takos側は自サーバ内の既存ロジックと同等に処理。

### 5.3 `account_search v0.1`（takos ⇒ FASP）

- `GET /account_search/v0/search?term=...&limit=...`
- 200で **Actor URI配列**を返す。`Link: rel="next"` によるページング可。
- takosは返却URIをキャッシュし、必要に応じフォロー/プロフィール取得を行う。

---

## 6. takos host の **Service Actor** 仕様

### 6.1 公開エンドポイント

- **Actor**：`GET https://{takos-host}/actor`

  - 例（最小構成）：

    ```json
    {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1"
      ],
      "id": "https://{takos-host}/actor",
      "type": "Service", // or "Application"
      "preferredUsername": "takos",
      "inbox": "https://{takos-host}/inbox",
      "outbox": "https://{takos-host}/outbox",
      "publicKey": {
        "id": "https://{takos-host}/actor#main-key",
        "owner": "https://{takos-host}/actor",
        "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
      }
    }
    ```
  - `type` は AS2の**Service**（サービス用途）または
    **Application**（アプリケーション用途）を選択可。用途上は **Service** 推奨。
    ([W3C][1])

- **inbox/outbox**

  - `inbox`：受信（Follow、Undo、Block等）を処理。
  - `outbox`：配信（Accept、Announce/Forward等）を発行。

### 6.2 Service Actor のフォローと配信

- **Follow受付**

  - 受領：`Follow{ actor: <follower>, object: <takos-actor> }`
  - 応答：`Accept(Follow)` を outbox から配信。
- **配信方針**

  - takos が把握する **公開・discoverable** な新規/更新コンテンツの **URI**
    を、フォロワーへ **Announce**（または必要に応じて元オブジェクトの配信）

    - フィルタ：ローカル投稿＋連合経由で知り得たリモート投稿のうち、公開・許可済のみ。
    - バッチ/しきい値：FASP `data_sharing` の
      `trends`/しきい値と整合性あるバッチングを推奨（過剰配信を回避）。
- **ブロック/オプトアウト**

  - サーバ単位・アカウント単位での除外リストを適用（inboxでのBlock/Undoを尊重）。
- **レート制御**

  - outbox配送をQ化し、429/Retry-Afterを尊重。

> 補足：従来の“リレー”は投稿本文を転送する実装も存在しますが、本仕様では
> **URI中心**
> の共有を基本とし、本文取得はフォロワー側の既存APフェッチに委譲します（Fediscoveryの設計に整合）。

---

## 7. takos 実装詳細

### 7.1 設定（例）

FASP 設定は MongoDB の `fasp_configs`
コレクションに保存され、管理UIで更新できる。

```json
{
  "enabled": true,
  "base_url": "https://{takos-host}/fasp",
  "capabilities": {
    "data_sharing": "0.1",
    "trends": "0.1",
    "account_search": "0.1"
  }
}
```

Service Actor 配信設定の例:

```yaml
service_actor:
  enabled: true
  actor_url: https://{takos-host}/actor
  type: Service # または Application
  deliver_batch_size: 20
  deliver_min_interval_ms: 200
  allow_instances:
    - "*"
  deny_instances: []
```

### 7.2 takos サーバAPI（FASPから呼ばれる）

- `POST /registration`
- `GET /provider_info`
- `POST /data_sharing/v0/event_subscriptions`
- `DELETE /data_sharing/v0/event_subscriptions/{id}`
- `POST /data_sharing/v0/backfill_requests`
- `POST /data_sharing/v0/backfill_requests/{id}/continuation`
- `POST /data_sharing/v0/announcements`

（認証：RFC9421、`Content-Digest` 必須）

### 7.3 takos → FASP（クライアント）

- `GET /provider_info`
- `POST|DELETE /capabilities/<id>/<version>/activation`
- `POST /data_sharing/v0/announcements`
- `GET /trends/v0/content|hashtags|links`
- `GET /account_search/v0/search`

各エンドポイントの詳細仕様は `docs/fasp/general/v0.1/` および
`docs/fasp/discovery/` 配下のドキュメントを参照。

### 7.4 Nodeinfo 例

```json
{
  "version": "2.0",
  "software": { "name": "takos", "version": "x.y.z" },
  "protocols": ["activitypub"],
  "openRegistrations": false,
  "metadata": {
    "faspBaseUrl": "https://{takos-host}/fasp"
  }
}
```

---

## 8. プライバシー/コンプライアンス

- **共有可能範囲**：公開かつ**discoverable**に同意済みのもののみ（未許可/非公開/Quiet
  Public/Unlistedは共有禁止）。FASP側も同条件で保存/索引。判定は **FEP-5feb**
  を使用。
- **検索語の扱い**：`account_search`
  では、takosが**検索語**をFASPへ送る可能性があるため、プライバシーポリシーに明記。

---

## 9. 運用

- **監視**：署名検証失敗・429・タイムアウト・アナウンス配送遅延をメトリクス化。
- **リトライ**：指数バックオフ。429は`Retry-After`準拠。
- **互換性**：ダブルノッキング結果をサーバ単位でキャッシュし、一定期間で再検証。

---

## 10. 実装メモ（最小プロトタイプ）

- Actor公開（`/actor`）とinbox/outboxの実装。
- Nodeinfoに `faspBaseUrl` を追加。
- RegistrationとCapability有効化の往復。
- `data_sharing`の event\_subscriptions/backfill
  受理・`announcements`送信の最小フロー。
- `trends`/`account_search` のクライアント呼び出しとUI表示。

---

## 11. takos host のリレーサーバー機能廃止

FASP の Service Actor 配信へ移行するため、takos host
がリレーサーバーとして動作する機能を廃止する。外部リレーに参加する機能は今後も提供する。

### API / CLI の更新

- `scripts/host_cli.ts` から `relay-*` コマンドを削除し、takos host
  でのリレーサーバー運用を停止する。
- takos host 専用のリレー関連 API
  やデータモデル（例：`app/api/models/takos_host/relay.ts`）を削除する。

### DB コレクションの取り扱い

- `hostrelays` など takos host 専用のコレクションは参照されなくなる。
- 必要な情報があればバックアップして Service Actor
  側へ移行した後、コレクションを削除する。不要であればそのまま破棄してよい。

### Service Actor 利用手順

- 外部サービスは `https://{takos-host}/actor`
  をフォローすることで投稿やアナウンスを受信できる。
- 配信仕様は本書第6章の Service Actor 仕様に従う。

### ドキュメントの更新

- takos host がリレーサーバーとして振る舞う旨を記載しているドキュメントや README
  を更新し、誤解を避ける。

---

## 参考

- FASP General（Intro/Protocol/Registration/Provider Info）
- FASP Discovery: **data\_sharing** / **trends** / **account\_search**
- ActivityStreams Actor Types（`Service` 含む） ([W3C][1])

[1]: https://www.w3.org/TR/activitystreams-vocabulary/#actor-types
