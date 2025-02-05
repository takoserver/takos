import {
  _ as s,
  a4 as t,
  c as a,
  o as i,
} from "./chunks/framework.Caa1YTU6.js";
const g = JSON.parse(
    `{"title":"tako'sの分散型プロトコル","description":"","frontmatter":{},"headers":[],"relativePath":"protocol/decentralized/index.md","filePath":"protocol/decentralized/index.md"}`,
  ),
  e = { name: "protocol/decentralized/index.md" },
  n = t(
    `<h1 id="tako-sの分散型プロトコル" tabindex="-1">tako&#39;sの分散型プロトコル <a class="header-anchor" href="#tako-sの分散型プロトコル" aria-label="Permalink to &quot;tako&#39;sの分散型プロトコル&quot;">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to &quot;概要&quot;">​</a></h2><p>tako&#39;sはmisskeyやmastdonのような形態のチャットアプリケーションを作成するためのプロトコルです。tako&#39;sは分散型のプロトコルであり、ユーザーは自分のサーバーを立ち上げることで、自分のデータを管理することができます。tako&#39;sは、ユーザーが自分のデータを管理することができるため、プライバシーが保護されます。</p><h2 id="エンドポイント" tabindex="-1">エンドポイント <a class="header-anchor" href="#エンドポイント" aria-label="Permalink to &quot;エンドポイント&quot;">​</a></h2><p>各サーバーは他のサーバーと通信するために、専用のエンドポイントを持っています。通信はすべてpostリクエストで行われ、署名付きのjsonデータを送信します。</p><p>エンドポイント</p><p><code>/takos/v2/server</code></p><h3 id="基本型" tabindex="-1">基本型 <a class="header-anchor" href="#基本型" aria-label="Permalink to &quot;基本型&quot;">​</a></h3><div class="language-typescript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">type</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Request</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  type</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  data</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> any</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">  sign</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">?:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> string</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div>`,
    9,
  ),
  l = [n];
function p(h, o, r, d, k, c) {
  return i(), a("div", null, l);
}
const y = s(e, [["render", p]]);
export { g as __pageData, y as default };
