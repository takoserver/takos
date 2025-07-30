## 1) 位置づけ（vocabulary 拡張）

- ベース: ActivityStreams 2.0（`as:`）
- 拡張語彙（例）: `story:` = `https://example.org/ns/story#` ※
  固定ではなく、実装側でホスト可能。
- 新規タイプ:

  - `story:Story` … エフェメラルまたは常設のストーリー全体
  - `story:Item` … ストーリー内に自由配置される要素の基底クラス

    - `story:ImageItem`
    - `story:VideoItem`
    - `story:TextItem`
    - （任意: `story:StickerItem`, `story:ShapeItem`, `story:AudioItem` など）

---

## 2) レンダリングモデル（自由配置）

**座標系**はビューポートに対する **正規化値**（0.0–1.0）を基本とし、UI
差異に強い相互運用を確保。

共通プロパティ（`story:Item`）:

- `bbox`: `{ "x": 0–1, "y": 0–1, "w": 0–1, "h": 0–1, "units": "fraction" }`
- `rotation`: 度数（時計回り）
- `zIndex`: レイヤ順（整数）
- `opacity`: 0–1
- `transform`: 省略可。必要なら CSS 互換の 2D/3D 行列文字列
- `anchor`: `"center"|"topLeft"|...`（配置基準点）
- `visibleFrom` / `visibleUntil`: アイテムの表示時間（秒）
- `tapAction`:
  `{ "type": "link|reply|none", "href": "...", "target": "_blank|_self" }`
- `contentWarning`: 文字列（CW がある場合はタップで展開）
- `accessibilityLabel`: 代替説明（スクリーンリーダ用）

ストーリー本体（`story:Story`）:

- `aspectRatio`: 例 `"9:16"`（任意）
- `item`: `story:Item`
- `expiresAt`: ISO8601（エフェメラル期限。省略可）
- `poster`: プレビュー用静止画
- `audioTrack`: （任意）BGM。`{ "href": "...", "start": 秒, "gain": -60〜+6 }`

---

## 3) 要素タイプ詳細

### ImageItem

- `type`: `"story:ImageItem"`
- `media`: ActivityStreams の `url` / `href`（コンテンツの URL / MediaType）
- `crop`:
  `{ "shape":"rect|circle|rounded", "radius":0–1, "focusX":0–1, "focusY":0–1 }`
- `filters`:
  `[{ "name":"brightness|contrast|saturate|blur|hueRotate", "value": number }]`
- `alt`: 代替テキスト（`accessibilityLabel` とどちらか必須推奨）

### VideoItem

- `type`: `"story:VideoItem"`
- `media`: （同上）
- `autoplay`: `true`（既定）
- `loop`: `true|false`
- `muted`: 既定 `true`
- `trim`: `{ "start": 秒, "end": 秒 }`
- `poster`: サムネイル

### TextItem

- `type`: `"story:TextItem"`
- `text`: プレーンテキスト or `content`（AS 準拠）
- `style`:
  `{ "fontFamily": string, "fontWeight": 100–900, "fontSize": em/px 相当の相対値, "lineHeight": number, "align":"left|center|right", "color": "#RRGGBBAA", "stroke": {"color":"#RRGGBB","width":number}, "shadow": {...}, "background": {...}, "padding": number }`
- `rtl`: `true|false`（双方向テキスト対応）
- `mentions`: `as:Tag[]`（`type:"Mention"` を推奨）

（任意）StickerItem/ShapeItem などは `media` or `shape`
と簡易アニメーション（`keyframes`）を許容。

---

## 4) ActivityPub での配信

- 作成: `as:Create{ object: story:Story }`
- 更新: `as:Update{ object: story:Story }`（軽微編集）
- 削除: `as:Delete{ object: story:Story }` ※ `expiresAt` 到来時、送信サーバは
  `Delete` の送出が望ましい（受信側も期限越えは非表示）。
- 受信互換: `to`/`cc`/`audience` で公開範囲。`as:Reply`
  による返信、`EmojiReaction` 拡張でリアクションを表現可。
- メディア配送: `media` は通常の添付（`as:attachment` / `url`）か、署名付き一時
  URL。HTTP Signatures/LD-Signatures は既存運用に準拠。

---

## 5) 後方互換（フォールバック）

- `story:Story` は **必ず** フォールバックを持つこと:

  - `as:Note` か `as:Video`/`as:Image` を **併記**（`summary` と `poster`
    を付与）。
  - 未対応サーバはそれをタイムライン表示できる。対応サーバは `story:`
    語彙を解釈しリッチ表示。
- プレビュー: `poster` と先頭アイテムのサマリテキストを `summary` に複製。

---

## 6) プライバシー / 安全

- `expiresAt` 満了時は UI 非表示、検索非対象推奨。
  （法的・運用上、完全消去は保証しないことを `sensitive`/`contentWarning`
  と合わせて明示可能）
- `sensitive: true` と `contentWarning` による閲覧前ガード。
- アクセシビリティ: `alt` / `accessibilityLabel`
  は必須推奨。自動字幕（VideoItem）用に `captions`（WebVTT）を許容。

---

## 7) 例（JSON‑LD）

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    { "story": "https://example.org/ns/story#" }
  ],
  "id": "https://alice.example/stories/abc123",
  "type": "story:Story",
  "attributedTo": "https://alice.example/users/alice",
  "published": "2025-07-30T03:12:00Z",
  "expiresAt": "2025-07-31T03:12:00Z",
  "to": ["https://www.w3.org/ns/activitystreams#Public"],
  "aspectRatio": "9:16",
  "poster": {
    "type": "Image",
    "url": "https://cdn.example/abc123/poster.jpg",
    "mediaType": "image/jpeg"
  },
  "item": {
    "type": "story:ImageItem",
    "media": {
      "type": "Link",
      "href": "https://cdn.example/abc123/photo1.jpg",
      "mediaType": "image/jpeg"
    },
    "bbox": { "x": 0.05, "y": 0.10, "w": 0.6, "h": 0.45, "units": "fraction" },
    "rotation": -2.5,
    "zIndex": 1,
    "alt": "朝焼けの街並み"
  },
  "attachment": [
    {
      "type": "Note",
      "summary": "ストーリーのプレビュー",
      "content": "おはよう！",
      "url": "https://alice.example/stories/abc123",
      "mediaType": "text/html"
    }
  ]
}
```

---

## 8) 相互運用のガイド

- **正規化座標**により、端末解像度差や UI オーバーレイに強い。エクスポート時に
  9:16 以外でも同一表現を維持。
- **期限と削除**: `expiresAt` 経過 → 受信側は非表示。送信側は `as:Delete`
  を送ることが望ましい。
- **返信 / リアクション**:
  `as:Create{object:Note, inReplyTo: <story>}`、`EmojiReaction` 拡張など。
- **ハイライト**（常設）: `story:Highlight`（任意）を `Collection`
  として定義し、`story:Story` を収蔵。

---

## 9) 実装メモ（最小要件）

1. 受信時、`story:` 未対応でも `poster` と `attachment`
   を使ってタイムラインで静的プレビュー表示。
2. 対応クライアントは `item` を解釈し、時間経過でストーリーを表示。
3. 投稿 UI は `ImageItem / VideoItem / TextItem` の編集（bbox, rotation,
   zIndex）を提供。
4. サーバはメディアに `mediaType` と `Content-Length`
   を付け、範囲リクエスト対応推奨。
