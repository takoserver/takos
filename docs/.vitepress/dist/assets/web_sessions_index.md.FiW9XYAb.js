import {
  _ as e,
  a4 as o,
  c as s,
  o as a,
} from "./chunks/framework.Caa1YTU6.js";
const f = JSON.parse(
    '{"title":"sessionシステム","description":"","frontmatter":{},"headers":[],"relativePath":"web/sessions/index.md","filePath":"web/sessions/index.md"}',
  ),
  t = { name: "web/sessions/index.md" },
  n = o(
    '<h1 id="sessionシステム" tabindex="-1">sessionシステム <a class="header-anchor" href="#sessionシステム" aria-label="Permalink to &quot;sessionシステム&quot;">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to &quot;概要&quot;">​</a></h2><p>tako&#39;sのsessionは各デバイスにsessionIDを発行し、そのsessionIDを利用してデバイス間での認証を行います。 各セッションにはdeviceKeyとkeyShareKeyが割り当てられ、これらの鍵を利用してデバイス間での暗号化通信を行います。</p><h2 id="セッションの生成" tabindex="-1">セッションの生成 <a class="header-anchor" href="#セッションの生成" aria-label="Permalink to &quot;セッションの生成&quot;">​</a></h2><p>セッションの生成は以下の手順で行います。</p>',
    5,
  ),
  i = [n];
function r(d, _, c, h, l, p) {
  return a(), s("div", null, i);
}
const u = e(t, [["render", r]]);
export { f as __pageData, u as default };
