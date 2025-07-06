# takosとは

> **言語について**: README
> とドキュメントは日本語版のみ提供されています。(English version is not
> available yet)

takosはActivityPubでweb自主するためのソフトウェアです。
takosは、ActivityPubに追加で、以下の機能を提供します。

このソフトウェアは、1人のユーザが、他のユーザとコミュニケーションを取るためのものです。
基本的に同一ドメインのユーザーは同一人物です。(サブアカウントなど)

## 🔧 技術スタック

**言語/ランタイム**: TypeScript/Deno\
**バックエンドフレームワーク**: Hono\
**フロントエンドフレームワーク**: Solid.js/tauri\
**データベース**: mongodb mongoose

## 🚀 GET started(backend)

環境変数を設定したら、`app/api` ディレクトリからサーバーを起動します。

特に `ACTIVITYPUB_DOMAIN` は Mastodon など外部からアクセスされる公開ドメインを
設定してください。未設定の場合はリクエストされたホスト名が利用されます。

```bash
cd app/api
deno task dev
```

## ActivityPub エンドポイント

サーバーを起動すると以下の ActivityPub API が利用できます。

- `/.well-known/webfinger` – WebFinger でアクターを検索
- `/users/:username` – `Person` アクター情報を JSON-LD で返します
- `/users/:username/outbox` – `Note` の投稿と取得
- `/users/:username/inbox` – ActivityPub 受信エンドポイント。`Create` Activity
  の場合はオブジェクトを `ActivityPubObject` として保存し、他の Activity
  は保存せず処理のみ行います。処理は Activity タイプごとにハンドラー化し、
  新しい Activity を追加しやすくしています。
- `/api/activitypub/actor-proxy` – 外部ユーザー情報を取得し、MongoDB に 24
  時間キャッシュします

外部ユーザー情報のキャッシュは TTL インデックスにより 24
時間後に自動削除されます。これにより同じユーザー情報を繰り返し取得する際のネットワーク負荷を抑えられます。

`outbox` へ `POST` すると以下の形式でノートを作成できます。

```json
{
  "type": "Note",
  "content": "hello"
}
```

## Microblog API

簡単なテキスト投稿を行う `/api/microblog` エンドポイントも利用できます。

- `GET /api/microblog` – 投稿を新しい順で取得
- `POST /api/microblog` – 投稿を作成
  (`{ "author": "user", "content": "hello" }`)
- `PUT /api/microblog/:id` – 投稿を更新 (`{ "content": "edited" }`)
- `DELETE /api/microblog/:id` – 投稿を削除
- `POST /api/microblog/:id/like` – いいねを追加
- `POST /api/microblog/:id/retweet` – リツイートを追加
