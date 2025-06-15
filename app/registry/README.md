# Takopack レジストリサーバー

このディレクトリには Hono を用いた最小限のレジストリ実装例が含まれます。
パッケージ情報は MongoDB で管理され、`MONGO_URI` で接続先を指定します。
`REGISTRY_DIR` 環境変数（デフォルト `./registry`）で指定したディレクトリから
`.takopack` アーカイブを提供します。 ブラウザから操作できる簡易管理ページ
`/admin` も用意されています。

## エンドポイント

- `GET /api/index.json` - パッケージ一覧（`ETag` と `Last-Modified` 付き）
- `GET /search?q=<keyword>&limit=<n>` - キーワードで検索
- `GET /packages/<id>` - 指定した識別子の最新パッケージ情報
- `POST /login` - ユーザー認証。`REGISTRY_USER` と `REGISTRY_PASS`
  で認証情報を設定 し、ドメイン登録やパッケージ公開時に使用するセッションを取得
- `POST /register` - メールアドレスでアカウント作成（確認メール送信）
- `GET /verify/<token>` - メールのリンクからアカウントを有効化
- `POST /domains/request` - 逆ドメイン所有確認トークンを発行（レスポンスに
  `token` を含む）
- `POST /domains/verify` - ドメイン確認を完了
  - `/domains/request` のトークンを `takopack-verify=<token>` という TXT
    レコードとして追加してから実行します
- `GET /domains` - 登録済みドメイン一覧を取得
- `POST /packages` - パッケージ登録（ドメイン確認済みが必要）
- `GET /<file>` - `.takopack` アーカイブのダウンロード

## サーバーの起動方法

```bash
cd app/registry
deno task start
```

`PORT` 環境変数（デフォルト `8080`）でリッスンするポートを指定できます。
`MONGO_URI` を設定すると MongoDB の接続先を変更できます。 `REGISTRY_USER` と
`REGISTRY_PASS` を設定すると `/login` で取得するセッションに利用されます。
このセッションはドメイン登録とパッケージ公開の際だけ必要です。
メール認証に使用する確認リンクは `VERIFY_BASE_URL` 環境変数で生成されます。
