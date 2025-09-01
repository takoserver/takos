# Cloudflare Workers へのチE�Eロイ�E�エチE��・プロキシ構�E�E�E
Takos のバックエンド�E MongoDB などに依存しており、Cloudflare Workers の実行環墁E��ECP 不可�E�へ直接移植する�Eは困難です。そこで本リポジトリでは、以下�E構�Eを用意しました、E
- 静的フロント！Eapp/takos_host/client/dist`�E��E Workers Assets から配信
- 動的 API�E�E/auth/*`, `/user/*` など�E��E既存�E Deno ホストへプロキシ

これにより、Cloudflare Workers 側はエチE�� CDN として機�Eし、既存サーバ�Eの前段に置く形で動作します、E
## 1. 前提

- Deno v1.28 以上（本リポジトリの開発前提�E�E- Wrangler�E�Eloudflare Workers CLI�E�E
```sh
npm i -g wrangler
```

## 2. フロントをビルチE
```sh
cd app/takos_host/client
deno task build
```

出力�E `app/takos_host/client/dist` に生�Eされます！Eorkers Assets が参照�E�、E
## 3. ORIGIN_URL を設宁E
Workers から動的 API を転送する既孁EDeno サーバ�Eの URL を設定します、E
```sh
cp .dev.vars.example .dev.vars
# エチE��タで ORIGIN_URL を既存サーバ�Eに合わせて変更
```

また�E `wrangler.toml` の `[vars]` で持E��しても構いません、E
既存サーバ�E�E�オリジン�E��E通常次のように起動しまぁE

```sh
deno run -A app/takos_host/main.ts
# また�E忁E��に応じて deno task dev など
```

## 4. ローカルで起勁E
```sh
wrangler dev
```

`/user` と `/auth` は静的 SPA を�E信し、`/user/*` と主要な `/auth/*` API は ORIGIN_URL へプロキシされます、E
### app/dev からのマルチテナント検証�E�Eorkers 経由�E�E
dev 用の 2 つのホスト！Ehost1.local`, `host2.local`�E�を Workers で模擬できます。`TENANT_HOST` により `x-forwarded-host` を強制します、E
```sh
# 既孁EDeno サーバ�Eを起動（単一プロセスで OK。テナント�Eヘッダで刁E���E�Edeno run -A app/takos_host/main.ts

# Workers 側�E�タチE�E�Edeno task --cwd app/dev workers:host1

# Workers 側�E�タチE�E�Edeno task --cwd app/dev workers:host2
```

どちらも同じオリジン�E�EORIGIN_URL`�E�へ転送しますが、`TENANT_HOST` により `host1.local` / `host2.local` としてチE��ント解決されます、E
## 5. チE�Eロイ

```sh
wrangler deploy
```

## ルーチE��ングの概要E
- GET `/user` ↁE`index.html`�E�Essets�E�E- GET `/user/*` ↁE先に Assets�E�E/user` を剥がして配信�E�！E04 なめEORIGIN へ
- GET `/auth` ↁE`index.html`�E�Essets�E�E- GET `/auth/*` ↁE先に Assets�E�E/auth` を剥がして配信�E�！E04 なめEORIGIN へ
- 靁EGET/HEAD は全て ORIGIN へ�E�E/user/*` はパスを剥がして転送E��E- `/oauth*`, `/actor`, `/inbox`, `/outbox`, `/.well-known/*` は ORIGIN 優允E- 上記以外�E GET ↁE先に Assets�E�E04 なめEORIGIN ↁEさらに 404 なめE`index.html`

忁E��に応じて `app/takos_host/worker.ts` を拡張してください�E�侁E 他�E API を�Eロキシへ追加�E�、E
補足: Worker はオリジンへ転送する際に `x-forwarded-host` と `x-forwarded-proto` を付与します。サーバ�E側は `x-forwarded-host` を優先してチE��ント解決を行います！Eapp/takos_host/utils/host_context.ts:78` 付近�E `getRealHost` を参照�E�、E
## Host API めEWorkers で直接提供！E1 + R2�E�E
takos host の API�E�E/auth/*`, `/user/*`�E�を Cloudflare Workers 上で直接提供する�E口も用意してぁE��す、E
- エントリ: `app/takos_host/host_api_worker.ts`
- DB: D1�E�バインチE��ング `TAKOS_HOST_DB`�E�E- オブジェクトストレージ: R2�E�EOBJECT_STORAGE_PROVIDER=r2`, `R2_BUCKET=<binding>`�E�E
手頁E

1) D1 を作�Eしスキーマを適用

```sh
wrangler d1 create takos_host
wrangler d1 execute <DB_NAME> --file app/takos_host/db/d1/schema.sql
```

2) R2 バケチE��を作�E�E�E[[r2_buckets]]` バインチE��ングめEwrangler.toml に設定！E
3) ローカル起動！Eost1/host2 チE��ント想定！E
```sh
deno task --cwd app/dev workers:api:host1
deno task --cwd app/dev workers:api:host2
```

host_api_worker は起動時に D1 めE`setStoreFactory(createD1DataStore)` で差し込み、R2 バインチE��ングめE`globalThis[env.R2_BUCKET]` に公開して `createObjectStorage` が利用できるようにします、E
