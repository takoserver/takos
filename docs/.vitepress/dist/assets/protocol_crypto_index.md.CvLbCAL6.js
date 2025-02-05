import {
  _ as s,
  a4 as e,
  c as i,
  o as a,
} from "./chunks/framework.Caa1YTU6.js";
const E = JSON.parse(
    '{"title":"分散型チャットサービスでのE2EE暗号化","description":"","frontmatter":{},"headers":[],"relativePath":"protocol/crypto/index.md","filePath":"protocol/crypto/index.md"}',
  ),
  t = { name: "protocol/crypto/index.md" },
  n = e(
    `<h1 id="分散型チャットサービスでのe2ee暗号化" tabindex="-1">分散型チャットサービスでのE2EE暗号化 <a class="header-anchor" href="#分散型チャットサービスでのe2ee暗号化" aria-label="Permalink to &quot;分散型チャットサービスでのE2EE暗号化&quot;">​</a></h1><h2 id="はじめに" tabindex="-1">はじめに <a class="header-anchor" href="#はじめに" aria-label="Permalink to &quot;はじめに&quot;">​</a></h2><p>このドキュメントは、分散型チャットサービスでのE2EE暗号化について説明します。</p><h2 id="e2ee暗号化とは" tabindex="-1">E2EE暗号化とは <a class="header-anchor" href="#e2ee暗号化とは" aria-label="Permalink to &quot;E2EE暗号化とは&quot;">​</a></h2><p>E2EE暗号化（End-to-End Encryption）は、通信の送信者と受信者の間でのみ復号化できる暗号化方式です。中間者攻撃に対して強力なセキュリティを提供します。</p><h2 id="tako-sのe2ee暗号化の基本的な仕組み" tabindex="-1">tako&#39;sのE2EE暗号化の基本的な仕組み <a class="header-anchor" href="#tako-sのe2ee暗号化の基本的な仕組み" aria-label="Permalink to &quot;tako&#39;sのE2EE暗号化の基本的な仕組み&quot;">​</a></h2><p>masterKeyをユーザー間で正しいことを確認し、masterKeyで署名された鍵を利用して暗号化を行います。</p><p>masterKeyのほかに以下の鍵が利用されます。</p><ul><li>identityKey</li><li>accountKey</li><li>roomKey</li><li>deviceKey</li><li>keyShareKey</li><li>messageKey</li><li>migrateSignKey</li></ul><p>masterKeyを含め後程詳しく説明します。</p><p>基本的なデータ型</p><ul><li>Sign</li></ul><div class="language-typescript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">type</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Sign</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  signature</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> // 署名をbase64エンコードしたもの</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  hashedPublicKeyHex</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> // 署名に利用した鍵の公開鍵をハッシュ化し、16進数文字列に変換したもの</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  type</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;master&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> |</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;identity&quot;</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  version</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> number</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> // 署名のバージョン</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div>`,
    13,
  ),
  l = [n];
function h(p, r, k, o, d, c) {
  return a(), i("div", null, l);
}
const g = s(t, [["render", h]]);
export { E as __pageData, g as default };
