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
            text: "foundation api",
            link: "/protocol/decentralized/server",
            collapsed: false,
            items: [
              {
                text: "サーバーキー取得",
                link: "/protocol/decentralized/server/getServerKey",
              },
              {
                text: "requestを受諾",
                link: "/protocol/decentralized/server/accept",
              },
              {
                text: "requestを拒否",
                link: "/protocol/decentralized/server/reject",
              },
              {
                text: "publicGroupへの参加を許可(外部ユーザー)",
                link: "/protocol/decentralized/server/acceptRequestJoinPublicGroup",
              },
              {
                text: "グループのiconを変更",
                link: "/protocol/decentralized/server/changeGroupIcon",
              },
              {
                text: "グループの名前を変更",
                link: "/protocol/decentralized/server/changeGroupName",
              },
              {
                text: "publicグループのメッセージを削除",
                link: "/protocol/decentralized/server/deleteMessagePublicGroup",
              },
              {
                text: "publicグループに参加",
                link: "/protocol/decentralized/server/joinPublicGroup",
              },
              {
                text: "groupに招待する",
                link: "/protocol/decentralized/server/inviteGroup",
              },
              {
                text: "groupからキックする",
                link: "/protocol/decentralized/server/kickGroup",
              },
              {
                text: "groupから退出する",
                link: "/protocol/decentralized/server/leaveGroup",
              },
              {
                text: "publicグループから退出する",
                link: "/protocol/decentralized/server/leavePublicGroup",
              },
              {
                text: "friend申請",
                link: "/protocol/decentralized/server/requestFriend",
              },
              {
                text: "publicグループへの参加をリクエスト",
                link: "/protocol/decentralized/server/requestPublicGroup",
              },
              {
                text: "メッセージを送信",
                link: "/protocol/decentralized/server/sendMessage",
              },
              {
                text: "masterキーを取得",
                link: "/protocol/decentralized/client/getMasterKey",
              },
              {
                text: "accountKeyを取得",
                link: "/protocol/decentralized/client/getAccountKey",
              },
              {
                text: "identityKeyを取得",
                link: "/protocol/decentralized/client/getIdentityKey",
              },
              {
                text: "roomKeyを取得",
                link: "/protocol/decentralized/client/getRoomKey",
              },
              {
                text: "roomKeyのmetaDataを取得",
                link: "/protocol/decentralized/client/getRoomKeyMetaData",
              },
              {
                text: "friendのiconを取得",
                link: "/protocol/decentralized/client/getFriendIcon",
              },
              {
                text: "friendの名前を取得",
                link: "/protocol/decentralized/client/getFriendNickName",
              },
              {
                text: "friendの情報を取得する",
                link: "/protocol/decentralized/client/getFriendInfo",
              },
              {
                text: "groupのiconを取得",
                link: "/protocol/decentralized/client/getGroupIcon",
              },
              {
                text: "groupの名前を取得",
                link: "/protocol/decentralized/client/getGroupName",
              },
              {
                text: "groupの情報を取得する",
                link: "/protocol/decentralized/client/getGroupInfo",
              },
              {
                text: "messageを取得",
                link: "/protocol/decentralized/client/getMessage",
              },
              {
                text: "publicGroupのiconを取得",
                link: ""
              }
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
