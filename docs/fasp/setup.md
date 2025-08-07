# FASP 初期設定とマイグレーション

FASP 登録情報と capability 状態はデータベースの `Fasp` モデルで管理します。
ここでは初期データの作成と既存環境からの移行手順をまとめます。 詳細な仕様は
`docs/FASP.md` および `docs/fasp/general/v0.1/` 内の文書を参照してください。

## 初期データ作成

1. FASP から `POST /registration` で送信された
   `name`・`baseUrl`・`serverId`・`publicKey` を受け取り、 `Fasp`
   モデルに保存します。
2. サーバー側で `faspId` と Ed25519 キーペアを生成し、同モデルの
   `publicKey`・`privateKey` に格納します。
3. 管理者が登録を承認したら `accepted` を `true` に更新します。

## Capability マイグレーション

1. `GET /provider_info` を呼び出して利用可能な capability
   とバージョンを取得します。
2. 管理 UI で有効化した capability を `capabilities` 配列に追加し、`enabled`
   フラグを設定します。
3. これまで `.env` に記載していた FASP 関連の設定値がある場合は削除し、すべて
   `Fasp` モデルで管理します。

## データ共有イベントの管理

- FASP から受信した `event_subscriptions` と `backfill_requests` はそれぞれ
  `eventSubscriptions`・`backfillRequests` に保存され、通信履歴は
  `communications` に記録されます。必要に応じて管理者はこれらを確認し、問題が
  あれば FASP 側と連絡を取ってください。
