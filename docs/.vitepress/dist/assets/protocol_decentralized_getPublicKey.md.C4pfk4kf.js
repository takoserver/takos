import {
  _ as s,
  a4 as e,
  c as i,
  o as a,
} from "./chunks/framework.Caa1YTU6.js";
const g = JSON.parse(
    '{"title":"getPublicKey","description":"","frontmatter":{},"headers":[],"relativePath":"protocol/decentralized/getPublicKey.md","filePath":"protocol/decentralized/getPublicKey.md"}',
  ),
  t = { name: "protocol/decentralized/getPublicKey.md" },
  n = e(
    `<h1 id="getpublickey" tabindex="-1">getPublicKey <a class="header-anchor" href="#getpublickey" aria-label="Permalink to &quot;getPublicKey&quot;">​</a></h1><p>検証用の公開鍵を取得する</p><p>request</p><div class="language-typescript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  type</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;getPublicKey&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  data</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">null</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>response</p><div class="language-typescript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  publicKey</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: string</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div>`,
    6,
  ),
  p = [n];
function l(h, c, r, d, o, k) {
  return a(), i("div", null, p);
}
const y = s(t, [["render", l]]);
export { g as __pageData, y as default };
