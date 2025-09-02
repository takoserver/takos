# takos host とは

takos host は takos
サーバーをレンタル形式で提供するためのホスティングソフトウェアです。ユーザーは
takos host 上でアカウントを作成し、ブラウザから takos
サーバーを借りてすぐに利用を開始できます。必要に応じてパスワードを設定できますが、基本的には
OAuth
でログインします。サーバーを貸与することで、アルゴリズムや著作権などの権利を利用者へ移譲し、誰でも自由に
takos を運用できるようにすることが目的です。

## 仕組み

1. takos host にメールアドレスを登録し、届いた確認コードを入力して
   ログインし、ユーザー画面から新しい takos サーバーを作成します。
2. サーバーごとに専用のドメインを割り当てたように見せかけますが、実際には 単一の
   Deno スクリプトで複数インスタンスを模倣します。
   個別のプロセスを起動・停止するわけではなく、takos と同等の API を共通
   ロジックとして取り込むことで、多数のサーバーが動作しているかのように振る舞う
   だけの構成です。
3. ユーザーは発行されたドメインへアクセスし、OAuth
   認証でログインします。パスワードを設定した場合は `/login`
   からログインできます。

ホスト側ではドメイン名を基にインスタンスを識別し、takos の API
を共通モジュールとして読み込んで処理します。これにより複数の takos
サーバーを一元管理できます。

`FREE_PLAN_LIMIT` で1ユーザーが作成できる無料インスタンス数を制限できます。
`RESERVED_SUBDOMAINS` を使うと、利用できないホスト名をあらかじめ指定できます。
現在はサブドメインのみ利用可能で、独自ドメイン機能は未実装です。takos host
から個別に環境変数を編集する機能はありません。

## ログインとユーザー API

ホストのドメインへアクセスすると、ウェルカムページが 表示されます。ログインは
`/auth`、ダッシュボードは `/user` から利用します。 `/auth`
では登録やログインなど API も提供され、取得したセッション Cookie
を送信することで `/user` 以下の API を利用できます。登録時に送信される
確認コードを入力すると、その時点で自動的にログイン状態となります。

- `POST /auth/register` 新規ユーザー登録
- `POST /auth/login` ログイン
- `GET /auth/status` セッション状態確認
- `DELETE /auth/logout` ログアウト
- `POST /auth/verify` メールアドレス確認
- `POST /auth/resend` 確認コード再送信

ユーザー API では以下のエンドポイントが利用できます。

- `GET /user/instances` 登録済みインスタンス一覧を取得
- `POST /user/instances` 新しいインスタンスを追加 (必要に応じてパスワードも設定)
- `DELETE /user/instances/:host` インスタンスを削除
- `GET /user/instances/:host` インスタンスの情報を取得 (ホスト名のみ)
- `PUT /user/instances/:host/password`
  インスタンスのログインパスワードを設定/変更 (空を送ると無効化)
  _独自ドメイン関連の API は今後実装予定です_

環境変数やパスワードを更新すると、キャッシュされたアプリが破棄され、次のアクセス時に再起動されます。

## フロントエンド

ユーザー画面は Vite と Solid.js で作られています。状態管理には solid-jotai
を用い、ページ間で共通の状態を保持します。 `app/takos_host/client`
で以下を実行すると開発サーバーが起動します。

```bash
$ deno task dev --env path/to/.env
```

`--env` を指定すると使用する環境変数ファイルを変更できます。

ビルドしたファイルは `client/dist`
に配置され、サーバーから自動的に配信されます。

### インスタンスへのログイン

各インスタンスでは基本的に OAuth を利用してログインします。まず
`/oauth/authorize` と `/oauth/token` を経由してアクセストークンを取得し、
インスタンスの `/api/login`
へ送信することでダッシュボードへアクセスできます。インスタンス作成時に 必要な
OAuth クライアントは自動登録されますが、追加で登録したい場合は
`/user/oauth/clients` を利用してください。

パスワードを設定した場合は `/login` へパスワードを POST
してログインできます。`POST /user/instances` で指定したパスワードは
`hashedPassword` と `salt` としてインスタンスの環境変数に保存されます。 OAuth
認証は常にホストの `OAUTH_HOST` を利用します。 インスタンスでは `/api/config`
にアクセスすることで `OAUTH_HOST` を取得でき、 ログイン画面は値が存在する場合に
OAuth ボタンを表示します。

## 起動方法

1. 初期設定（CLIで自動生成・手動編集不要）
   - ルートから実行: `deno task setup:host`
   - 対話なしで生成: `deno run -A scripts/setup_env.ts --target host --force --yes --domain host.example.com`
   - 生成後、必要に応じて `.env` を編集してください。
   - 主な変数:
     - `OAUTH_HOST`: OAuth サーバードメイン
     - `FREE_PLAN_LIMIT`: 無料プランのインスタンス作成上限
     - `RESERVED_SUBDOMAINS`: 利用禁止サブドメイン（カンマ区切り）
     - `TERMS_FILE`: 規約テキスト/Markdown のファイルパス

## 起動方法

takos host は Cloudflare Workers 専用のソフトウェアです。

1. Cloudflare Workers の設定を行います：
   - `wrangler.toml`: Host Worker 設定（ポータル用）
   - `wrangler.tenant.toml`: Tenant Worker 設定（テナント用）
   - D1 データベースと R2 ストレージの設定が必要です

2. クライアントをビルドします：
   ```sh
   cd app/takos_host/client
   deno task build
   ```

3. Workers をデプロイします：
   ```sh
   wrangler deploy --config wrangler.toml
   wrangler deploy --config wrangler.tenant.toml
   ```

## Cloudflare Workers 構成

- **Host Worker**: ルートドメイン（`takos.jp`, `www.takos.jp`）のポータル機能
- **Tenant Worker**: サブドメイン（`*.takos.jp`）のテナント機能
- 両方とも同一の D1 データベースと R2 ストレージを共有します

## 初期設定CLIについて

このリポジトリには、`.env` を自動生成する初期設定CLI（`scripts/setup_env.ts`）が含まれています。手動での初期設定なしで最小構成の環境を用意できます。詳細はリポジトリの `README.md` のクイックスタートをご覧ください。
