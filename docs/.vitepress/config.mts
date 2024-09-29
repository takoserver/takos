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
          {
            text: "sessions",
            link: "/web/sessions",
            collapsed: false,
            items: [
              { text: "login", link: "/web/sessions/login" },
              { text: "logout", link: "/web/sessions/logout" },
              { text: "register", link: "/web/sessions/registers" },
            ],
          },
          {
            text: "talk",
            link: "/web/talk",
            collapsed: false,
            items: [
              { text: "data", link: "/web/talk/data" },
              { text: "delete", link: "/web/talk/delete" },
              { text: "send", link: "/web/talk/send" },
            ]
          },
          {
            text: "user",
            link: "/web/user",
            collapsed: false,
            items: [
              { text: "key", link: "/web/user/key" },
              { text: "icon", link: "/web/user/icon" },
              { text: "nickName", link: "/web/user/nickName" },
            ]
          },
          {
            text: "profile",
            link: "/web/profile",
            collapsed: false,
            items: [
              { text: "nickName", link: "/web/profile/nickName" },
              { text: "icon", link: "/web/profile/icon" },
              { text: "key", link: "/web/profile/key" },
            ]
          },
          {
            text: "friend",
            link: "/web/friend",
            collapsed: false,
            items: [
              { text: "list", link: "/web/friend/list" },
              { text: "request", link: "/web/friend/request" },
              { text: "accept", link: "/web/friend/accept" },
              { text: "delete", link: "/web/friend/delete" },
            ]
          },
          {
            text: "group",
            link: "/web/group",
            collapsed: false,
            items: [
              { text: "create", link: "/web/group/create" },
              { text: "delete", link: "/web/group/delete" },
              { text: "join", link: "/web/group/join" },
              { text: "invite", link: "/web/group/invite" },
              { text: "leave", link: "/web/group/leave" },
              { text: "list", link: "/web/group/list" },
            ]
          },
          {
            text: "group",
            link: "/web/group",
            collapsed: false,
            items: [
              { text: "create", link: "/web/group/create" },
              { text: "delete", link: "/web/group/delete" },
              { text: "join", link: "/web/group/join" },
              { text: "leave", link: "/web/group/leave" },
              { text: "list", link: "/web/group/list" },
            ]
          }
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
