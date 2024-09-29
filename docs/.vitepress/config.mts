import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "takos api document",
  description: "takosのapiのドキュメントです",
  lang: "ja-JP",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Examples", link: "/markdown-examples" },
    ],
    search: {
      provider: "local",
    },
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "quick-start", link: "/welcome" },
        ],
      },
      {
        text: "Takos Protocol",
        link: "/protocol",
        collapsed: false,
        items: [
          {
            text: "Takos Encrypt Ink",
            link: "/protocol/crypto",
            collapsed: false,
            items: [
              { text: "masterKey", link: "/protocol/crypto/masterkey" },
              { text: "identityKey", link: "/protocol/crypto/identityKey" },
              { text: "accountKey", link: "/protocol/crypto/accountKey" },
              { text: "roomKey", link: "/protocol/crypto/roomKey" },
              { text: "deviceKey", link: "/protocol/crypto/deviceKey" },
              { text: "keyShareKey", link: "/protocol/crypto/keyShareKey" },
              { text: "migrateKey", link: "/protocol/crypto/migrateKey" },
              { text: "migrateSignKey", link: "/protocol/crypto/migrateSignKey" },
              { text: "talkData", link: "/protocol/crypto/talkData" },
            ],
          },
          {
            text: "decentralized",
            link: "/protocol/decentralized",
            collapsed: false,
            items: [
              { text: "getPublicKey", link: "/protocol/decentralized/getPublicKey" },
            ],
          },
        ],
      },
      {
        text: "takos web api",
        items: [
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
  base: "/",
  head: [
    ["link", { rel: "icon", href: "/favicon.jpg" }],
  ],
})
//