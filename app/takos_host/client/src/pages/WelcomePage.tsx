import { Component, For, onMount, Show } from "solid-js";
import { useAtom } from "solid-jotai";
import { loggedInState, rootDomainState, userNameState } from "../state.ts";

// ------------------------------
// Enhanced Icons with better accessibility
// ------------------------------
const _Check = () => (
  <svg
    class="w-5 h-5 inline-block text-emerald-500"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const _Cross = () => (
  <svg
    class="w-5 h-5 inline-block text-rose-400"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Download = () => (
  <svg
    class="w-5 h-5"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const ArrowRight = () => (
  <svg
    class="w-5 h-5"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const Shield = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const Zap = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
  </svg>
);

const Puzzle = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M19.439 7.85c-.049.322-.059.648-.026.975.039.412.128.819.268 1.205.087.24.187.479.313.705.066.132.145.259.234.381.068.073.146.143.231.204.1.069.202.138.327.191.204.08.4.121.611.121.303 0 .611-.063.894-.207.284-.144.544-.334.753-.566.209-.232.369-.507.468-.805.1-.298.129-.616.098-.928-.031-.312-.129-.616-.272-.895-.143-.279-.334-.53-.566-.739-.232-.209-.507-.369-.805-.468-.298-.1-.616-.129-.928-.098-.312.031-.616.129-.895.272-.279.143-.53.334-.739.566-.209.232-.369.507-.468.805z" />
  </svg>
);

const Globe = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const Lock = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <circle cx="12" cy="16" r="1" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const Smartphone = () => (
  <svg
    class="w-8 h-8 text-indigo-400 mb-4"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    viewBox="0 0 24 24"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

// ------------------------------
// Enhanced Data with icons
// ------------------------------
const FEATURES = [
  {
    icon: Shield,
    title: "完全オープンソース",
    desc:
      "GPL v3 ライセンスで透明性と自由度を確保。あなたのサーバーをあなたのルールで運営できます。",
    highlight: "透明性",
  },
  {
    icon: Zap,
    title: "あなたのサーバー",
    desc:
      "数分でセットアップ可能な ActivityPub サーバー。個人やコミュニティのためのプライベートな SNS を簡単に構築。",
    highlight: "自主性",
  },
  {
    icon: Puzzle,
    title: "シンプルなUI",
    desc:
      "直感的で使いやすいインターフェース。誰でも簡単に操作できるよう設計されています。",
    highlight: "使いやすさ",
  },
  {
    icon: Globe,
    title: "ゼロ・ロックイン",
    desc:
      "ActivityPub 準拠で他 Fediverse ノードと自由に連携。いつでもデータをエクスポート可能。",
    highlight: "自由度",
  },
  {
    icon: Lock,
    title: "プライベートDM",
    desc: "シンプルなダイレクトメッセージで気軽にやり取りできます。",
    highlight: "プライベート",
  },
  {
    icon: Smartphone,
    title: "マルチプラットフォーム",
    desc:
      "デスクトップ／Tauri クライアント + iOS/Android アプリを同梱。どこでも快適に利用可能。",
    highlight: "便利",
  },
];

// 他社サービスとの具体的な比較
const COMPARISON = [
  {
    label: "OSS (オープンソース)",
    takos: "○",
    others: {
      Mastodon: "○",
      Misskey: "○",
      Twitter: "×",
      Facebook: "×",
    },
  },
  {
    label: "非中央集権",
    takos: "○",
    others: {
      Mastodon: "○",
      Misskey: "○",
      Twitter: "×",
      Facebook: "×",
    },
  },
  {
    label: "E2EE (エンドツーエンド暗号化)",
    takos: "○",
    others: {
      Mastodon: "×",
      Misskey: "×",
      Twitter: "×",
      Facebook: "×",
    },
  },
  {
    label: "サーバー所有権",
    takos: "○",
    others: {
      Mastodon: "×",
      Misskey: "×",
      Twitter: "×",
      Facebook: "×",
    },
  },
  {
    label: "言論の自由",
    takos: "○",
    others: {
      Mastodon: "○",
      Misskey: "○",
      Twitter: "△",
      Facebook: "△",
    },
  },
];

// ------------------------------
// Enhanced Component with better UX
// ------------------------------
const LandingPage: Component = () => {
  const [loggedIn] = useAtom(loggedInState);
  const [userName] = useAtom(userNameState);
  const [rootDomain] = useAtom(rootDomainState);

  onMount(async () => {
    if (!loggedIn()) return;
    const actor = `${userName()}@${rootDomain()}`;
    try {
      await fetch(
        `/api/dm?user1=${encodeURIComponent(actor)}&user2=${
          encodeURIComponent(actor)
        }`,
      );
    } catch {
      // 失敗しても無視
    }
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100 font-sans antialiased">
      {/* Enhanced Sticky Nav with better backdrop */}
      <header class="fixed top-0 inset-x-0 z-50 backdrop-blur-xl supports-[backdrop-filter]:bg-gray-900/90 border-b border-gray-800/50 shadow-lg">
        <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <a
            href="/"
            class="flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              T
            </div>
            takos
          </a>
          <nav class="hidden md:flex gap-8 text-sm font-medium">
            <a
              href="#features"
              class="hover:text-indigo-400 transition-colors py-2"
            >
              機能
            </a>
            <a
              href="#compare"
              class="hover:text-indigo-400 transition-colors py-2"
            >
              比較
            </a>
            <a
              href="https://github.com/takoserver/takos"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-indigo-400 transition-colors py-2"
            >
              GitHub
            </a>
          </nav>
          <Show
            when={loggedIn()}
            fallback={
              <a
                href="/auth"
                class="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:from-indigo-500 hover:to-indigo-400 transition-all duration-200 transform hover:scale-105"
              >
                ログイン
              </a>
            }
          >
            <a
              href="/user"
              class="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 transform hover:scale-105"
            >
              ダッシュボード
            </a>
          </Show>
        </div>
      </header>

      {/* Enhanced Hero with better visual hierarchy */}
      <section
        class="pt-36 pb-32 text-center px-6 relative overflow-hidden"
        id="hero"
      >
        {/* Subtle background pattern */}
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]">
        </div>

        <div class="relative z-10">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-950/50 border border-indigo-500/20 rounded-full text-sm text-indigo-300 mb-8">
            <div class="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
            Open Source ActivityPub Server
          </div>

          <h1 class="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-6">
            一人一台の
            <br class="sm:hidden" />
            <span class="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ActivityPub
            </span>
            <br />
            サーバー
          </h1>

          <p class="mt-8 max-w-3xl mx-auto text-xl sm:text-2xl text-gray-300 leading-relaxed">
            <span class="font-semibold text-indigo-300">takos host</span>{" "}
            は、分散型 SNS を
            <span class="font-semibold text-emerald-300">ゼロ知識</span>でも
            <br class="hidden sm:inline" />
            数分で立ち上げられるオープンソース・プラットフォームです。
          </p>

          <div class="mt-12 flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <a
              href="/download"
              class="group inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-xl hover:shadow-2xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105"
            >
              <Download />
              アプリをダウンロード
            </a>
            <a
              href="/signup"
              class="group inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 border-2 border-gray-500 text-gray-200 font-semibold hover:bg-gray-800 hover:border-gray-400 transition-all duration-300 transform hover:scale-105"
            >
              無料で始める
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>

      {/* Enhanced Features with better cards */}
      <section
        id="features"
        class="py-24 bg-gray-950/60 backdrop-blur-md relative"
      >
        <div class="max-w-7xl mx-auto px-6">
          <div class="text-center mb-16">
            <h2 class="text-4xl sm:text-5xl font-bold mb-6">
              なぜ <span class="text-indigo-400">takos</span> なのか？
            </h2>
            <p class="text-xl text-gray-300 max-w-3xl mx-auto">
              従来のSNSプラットフォームの制約から解放され、真に自由なコミュニケーションを実現
            </p>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <For each={FEATURES}>
              {(f) => {
                const IconComponent = f.icon;
                return (
                  <div class="group relative rounded-3xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50 hover:border-indigo-500/50">
                    <div class="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    </div>

                    <div class="relative z-10">
                      <IconComponent />
                      <div class="inline-flex items-center gap-2 mb-4">
                        <h3 class="text-xl font-bold text-white">{f.title}</h3>
                        <span class="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                          {f.highlight}
                        </span>
                      </div>
                      <p class="text-gray-300 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </section>

      {/* Enhanced Comparison with better table design */}
      <section id="compare" class="py-24 px-6">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-16">
            <h2 class="text-4xl sm:text-5xl font-bold mb-6">
              他社サービスとの比較
            </h2>
            <p class="text-xl text-gray-300">
              なぜ takos が最適な選択なのかを数字で比較
            </p>
          </div>

          <div class="bg-gray-900/50 rounded-3xl p-8 shadow-2xl border border-gray-700/50 overflow-x-auto">
            <table class="w-full text-sm md:text-base">
              <thead>
                <tr class="border-b-2 border-gray-700">
                  <th class="py-6 text-left font-bold text-lg">項目</th>
                  <th class="py-6 font-bold text-lg">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                        T
                      </div>
                      takos
                    </div>
                  </th>
                  <th class="py-6 font-bold text-lg text-gray-400">
                    Mastodon
                  </th>
                  <th class="py-6 font-bold text-lg text-gray-400">Misskey</th>
                  <th class="py-6 font-bold text-lg text-gray-400">Twitter</th>
                  <th class="py-6 font-bold text-lg text-gray-400">
                    Facebook
                  </th>
                </tr>
              </thead>
              <tbody>
                <For each={COMPARISON}>
                  {(row, index) => (
                    <tr
                      class={`border-b border-gray-800 last:border-none hover:bg-gray-800/30 transition-colors ${
                        index() % 2 === 0 ? "bg-gray-800/20" : ""
                      }`}
                    >
                      <td class="py-6 pr-6 font-medium">{row.label}</td>
                      <td class="py-6 text-center">
                        <span class="font-bold text-emerald-400 text-lg">
                          {row.takos}
                        </span>
                      </td>
                      <td class="py-6 text-center">
                        <span class="font-bold text-gray-300 text-lg">
                          {row.others.Mastodon}
                        </span>
                      </td>
                      <td class="py-6 text-center">
                        <span class="font-bold text-gray-300 text-lg">
                          {row.others.Misskey}
                        </span>
                      </td>
                      <td class="py-6 text-center">
                        <span class="font-bold text-gray-300 text-lg">
                          {row.others.Twitter}
                        </span>
                      </td>
                      <td class="py-6 text-center">
                        <span class="font-bold text-gray-300 text-lg">
                          {row.others.Facebook}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enhanced CTA with better visual impact */}
      <section class="py-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent_70%)]">
        </div>

        <div class="relative z-10 max-w-4xl mx-auto px-6">
          <h2 class="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-8 leading-tight">
            今すぐ、あなた専用の
            <br />
            サーバーを始めよう
          </h2>
          <p class="text-xl sm:text-2xl text-indigo-100 mb-12 max-w-2xl mx-auto">
            数分で設定完了。月額料金なし。完全にあなたのものです。
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <a
              href="/signup"
              class="group inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 bg-white text-gray-900 font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
            >
              無料で始める
              <ArrowRight />
            </a>
            <a
              href="/demo"
              class="group inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 border-2 border-white/50 text-white font-semibold hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
            >
              デモを見る
            </a>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer class="py-12 bg-gray-950/90 backdrop-blur-md border-t border-gray-800/50">
        <div class="max-w-7xl mx-auto px-6">
          <div class="text-center">
            <div class="flex items-center justify-center gap-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                T
              </div>
              <span class="text-xl font-bold">takos</span>
            </div>
            <p class="text-gray-400 text-sm">
              © {new Date().getFullYear()} takoserver. MIT Licensed.
              <span class="text-indigo-400">
                Made with ❤️ for the Fediverse
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
