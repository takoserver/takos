import { defineConfig } from "vitepress";

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
            collapsed: true,
          },
          {
            text: "サーバー間通信用api",
            link: "/protocol/decentralized/server",
            collapsed: true,
            items: [
              {
                text: "getServerKey",
                link: "/protocol/decentralized/server/getServerKey",
              },
              {
                text: "accept",
                link: "/protocol/decentralized/server/accept",
              },
              {
                text: "reject",
                link: "/protocol/decentralized/server/reject",
              },
              {
                text: "requestFriend",
                link: "/protocol/decentralized/server/requestFriend",
              },
              {
                text: "inviteGroup",
                link: "/protocol/decentralized/server/inviteGroup",
              },
              {
                text: "leaveGroup",
                link: "/protocol/decentralized/server/leaveGroup",
              },
              {
                text:"kickGroup",
                link: "/protocol/decentralized/server/kickGroup",
              },
              {
                text: "sendMessage",
                link: "/protocol/decentralized/server/sendMessage",
              },
              {
                text: "joinPublicGroup",
                link: "/protocol/decentralized/server/joinPublicGroup",
              },
              {
                text: "requestPublicGroup",
                link: "/protocol/decentralized/server/requestPublicGroup",
              },
              {
                text: "leavePublicGroup",
                link: "/protocol/decentralized/server/leavePublicGroup",
              },
              {
                text: "requestTextCall",
                link: "/protocol/decentralized/server/requestTextCall",
              },
            ],
          },
          {
            text: "クライアント向け標準api",
            link: "/protocol/decentralized/client",
            collapsed: true,
            items: [
              {
                text: "getMasterKey",
                link: "/protocol/decentralized/client/getMasterKey",
              },
              {
                text: "getIdentityKey",
                link: "/protocol/decentralized/client/getIdentityKey",
              },
              {
                text: "getAccountKey",
                link: "/protocol/decentralized/client/getAccountKey",
              },
              {
                text: "getRoomKey",
                link: "/protocol/decentralized/client/getRoomKey",
              },
              {
                text: "getServerIconImage",
                link: "/protocol/decentralized/client/getServerIconImage",
              },
              {
                text: "getServerBackgroundImage",
                link: "/protocol/decentralized/client/getServerBackgroundImage",
              },
              {
                text: "getServerInfo",
                link: "/protocol/decentralized/client/getServerInfo",
              },
              {
                text: "textCall",
                link: "/protocol/decentralized/client/textCall",
              },
              {
                text: "getMessage",
                link: "/protocol/decentralized/client/getMessage",
              },
              {
                text: "getGroupInfo",
                link: "/protocol/decentralized/client/getGroupInfo",
              },
              {
                text: "getFriendIcon",
                link: "/protocol/decentralized/client/getFriendIcon",
              },
              {
                text:"getFriendNickName",
                link: "/protocol/decentralized/client/getFriendNickName",
              },
            ],
          },
          {
            text: "処理",
            link: "/protocol/process",
            collapsed: false,
          },
          {
            text: "rooms",
            link: "/protocol/room",
            collapsed: false,
          },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
  base: "/",
  head: [
    ["link", { rel: "icon", href: "/logo.png" }],
  ],
});
