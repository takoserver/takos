# takosとは

> **言語について**: README とドキュメントは日本語版のみ提供されています。(English version is not available yet)

takosはActivityPubでweb自主するためのソフトウェアです。
takosは、ActivityPubに追加で、以下の機能を提供します。

このソフトウェアは、1人のユーザが、他のユーザとコミュニケーションを取るためのものです。
基本的に同一ドメインのユーザーは同一人物です。(サブアカウントなど)

## 🔧 技術スタック

**言語/ランタイム**: TypeScript/Deno\
**バックエンドフレームワーク**: Hono\
**フロントエンドフレームワーク**: Solid.js/tauri\
**データベース**: Prisma(prisma対応ならなんでも)

## 🚀 GET started(backend)

環境変数を設定したら、`app/api` ディレクトリからサーバーを起動します。

```bash
cd app/api
deno task dev
```

`dev` タスクでは Deno の `--unstable-worker-options`
フラグを付与して起動するため、拡張機能のサーバーコードを安全に実行できます。
拡張機能が `manifest.json` に宣言していない `deno:*` 権限を要求した場合、
ランタイムが自動的に拒否するため、`-A`
オプションを付けても余計な確認は発生しません。 Deno が出力する `✅ Granted ...`
というメッセージは、許可を求めているわけではなく
起動時に付与された権限を示すログです。 Worker 内では
`require`、`__dirname`、`__filename`、`global`、`process`、
`Buffer`、`setImmediate` といった Node 互換グローバルが利用できます。

## 🔨 Takopack Extensions

takosは拡張機能システム「Takopack」をサポートしています。Takopackを使用することで、VSCodeのように安全かつ柔軟にtakosを拡張できます。

### ビルド方法

```bash
# サンプル拡張機能をビルド
deno run --allow-all build.ts build

# 開発モード（ファイル監視）
deno run --allow-all build.ts watch

# ヘルプを表示
deno run --allow-all build.ts help
```

### 拡張機能の開発

1. **基本構造**：
   ```
   src/extension/
   ├── server.ts     # サーバーサイドモジュール
   ├── client.ts     # クライアントバックグラウンドスクリプト  
   └── index.html    # UI
   ```

2. **Fluent API**：
   ```typescript
   import Takopack from "./src/builder/takopack.ts";

   const takopack = new Takopack()
     .server("src/server.ts")
     .client("src/client.ts")
     .ui("src/index.html")
     .manifest({/* 設定 */});

   await takopack.build();
   ```

## 📚 ドキュメント

## 📚 ドキュメント

- **[Takopack Builder API](./docs/takopack/builder.md)** - Fluent APIの使用方法
- **[Takopack拡張機能仕様書](./docs/takopack/main.md)** - 拡張機能の仕様
- **[Takopack レジストリ仕様](./docs/takopack/registry.md)** - 拡張機能レジストリ仕様（`app/registry` に簡易実装あり）
- **[takos web](./docs/takos-web/index.md)** - Web API仕様
- **[ActivityPub (Additional object)](./docs/activityPub/index.md)** -
  ActivityPub拡張仕様

## 🎯 特徴

- **🔒 安全な拡張機能システム**: 権限ベースのセキュリティモデル
- **🚀 モダンな開発体験**: Fluent APIとVite統合
- **📦 簡単なパッケージング**: .takopackファイルでの配布
- **🔄 ActivityPub統合**: ネイティブなActivityPubサポート
- **⚡ ホットリロード**: 開発時のファイル監視機能
