# Takopack レジストリ仕様

Takopack 拡張機能パッケージを VSCode
の拡張機能マーケットプレイスのように配布する仕組みがレジストリです。レジストリは次のシンプルな
HTTP API を提供します。

- `GET /api/index.json` – 利用可能なパッケージ一覧を返します。`ETag` と
  `Last-Modified` を含み、条件付きリクエストで更新有無を確認できます。
- `GET /search?q=<keyword>&limit=<n>` –
  キーワードで検索したパッケージ一覧を返します。こちらも `ETag` /
  `Last-Modified` を返します。
- `GET /packages/<id>` – 特定の識別子の最新パッケージ情報を取得します。
- `POST /login` – 管理者の認証情報でログインし、セッションを取得します。ドメイン登録や
  パッケージ公開を行う際に使用します。
- `POST /register` –
  メールアドレスとパスワードでアカウントを作成し、確認メールを送信します。
- `GET /verify/<token>` –
  送信された確認メールのリンクでアカウントを有効化します。
- `POST /domains/request` – 逆ドメインの所有確認トークンを発行します。
- `POST /domains/verify` –
  サイトに設置したトークンを検証してドメインを登録します。
- `POST /packages` – パッケージを登録します。識別子に含まれるドメインが
  確認済みでなければなりません。
- `GET <downloadUrl>` – `index.json` で参照されている `.takopack`
  アーカイブをダウンロードします。

ドメイン確認では、`/domains/request` を呼び出すとトークンが発行されます。
対象ドメインの TXT レコードに `takopack-verify=<token>` を追加し、
`/domains/verify` で検証します。確認済みドメインの名前空間だけが
パッケージ識別子として利用できます。

`index.json` のフォーマットは以下の通りです。

```jsonc
{
  "packages": [
    {
      "identifier": "com.example.foo",
      "name": "Foo Extension",
      "version": "1.0.0",
      "description": "パッケージの概要",
      "downloadUrl": "https://registry.example.com/com.example.foo-1.0.0.takopack",
      "sha256": "<任意のsha256値>"
    }
  ]
}
```

クライアントは `index.json`
を取得して目的のパッケージを探し、アーカイブをダウンロードします。`sha256`
が指定されている場合はダウンロードしたファイルのハッシュを検証します。アーカイブの内容は
[`docs/takopack/v3.md`](./v3.md) で説明しているパック形式に準拠します。

`ETag` や `Last-Modified`
ヘッダーを利用した条件付きリクエストを行うことで、更新がない場合に 304
が返されるため無駄なダウンロードを避けられます。`/packages/<id>`
も同様にキャッシュを活用できます。

