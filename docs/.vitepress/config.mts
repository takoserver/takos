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
        collapsed: false,
        items: [
          {
            text: "Takos Encrypt Ink",
            link: "/protocol/crypto",
            collapsed: false,
            items: [
              { text: "account_key", link: "/protocol/crypto/account_key" },
              { text: "room_key", link: "/protocol/crypto/room_key" },
              { text: "device_key", link: "/protocol/crypto/device_key" },
              { text: "encrypt message", link: "/protocol/crypto/message" },
            ],
          },
          {
            text: "activity",
            link: "/protocol/activity",
            collapsed: false,
            items: [
              { text: "getPublicKey", link: "/protocol/activity/getPublicKey" },
            ],
          },
        ],
      },
      {
        text: "takos web api",
        items: [
          {
            text: "users",
            link: "/client/users",
            collapsed: false,
            items: [
              { text: "icon", link: "/client/users/icon" },
              { text: "userName", link: "/client/users/userName" },
              { text: "nickName", link: "/client/users/nickName" },
            ],
          },
          {
            text: "profile",
            link: "/client/profile",
            collapsed: false,
            items: [
              { text: "icon", link: "/client/profile/icon" },
              { text: "userName", link: "/client/profile/userName" },
              { text: "nickName", link: "/client/profile/nickName" },
              { text: "privacy", link: "/client/profile/privacy" },
            ],
          },

          {
            text: "sessions",
            link: "/client/sessions",
            collapsed: false,
            items: [
              { text: "login", link: "/client/sessions/login" },
              { text: "logout", link: "/client/sessions/logout" },
              { text: "register", link: "/client/sessions/register" },
            ],
          },
          {
            text: "friends",
            link: "/client/friends",
            collapsed: false,
            items: [
              { text: "request", link: "/client/friends/request" },
              { text: "accept", link: "/client/friends/accept" },
              { text: "delete", link: "/client/friends/delete" },
              { text: "requestList", link: "/client/friends/requestList" },
              { text: "search", link: "/client/friends/search " },
            ],
          },
          {
            text: "room",
            link: "/client/room",
            collapsed: false,
            items: [
              { "text": "create", link: "/client/room/create" },
              { "text": "delete", link: "/client/room/delete" },
              { "text": "join", link: "/client/room/join" },
              { "text": "invite", link: "/client/room/invite" },
              { "text": "leave", link: "/client/room/leave" },
              { "text": "setting", link: "/client/room/setting" },
            ],
          },
          {
            text: "community",
            link: "/client/community",
            collapsed: false,
            items: [
              { "text": "create", link: "/client/community/create" },
              { "text": "delete", link: "/client/community/delete" },
              { "text": "join", link: "/client/community/join" },
              { "text": "invite", link: "/client/community/invite" },
              { "text": "leave", link: "/client/community/leave" },
              { "text": "setting", link: "/client/community/setting" },
              { "text": "search", link: "/client/community/search" },
            ],
          },
          {
            text: "chat",
            link: "/client/chat",
            collapsed: false,
            items: [
              { "text": "text", link: "/client/chat/text" },
              { "text": "image", link: "/client/chat/image" },
              { "text": "file", link: "/client/chat/file" },
              { "text": "voice", link: "/client/chat/voice" },
              { "text": "video", link: "/client/chat/video" },
              { "text": "delete", link: "/client/chat/delete" },
              { "text": "list", link: "/client/chat/list" },
              { "text": "search", link: "/client/chat/search" },
              { "text": "talkData", link: "/client/chat/talkData" },
            ],
          },
          {
            text: "blcok",
            link: "/client/block",
            collapsed: false,
            items: [
              { text: "user", link: "/client/block/user" },
              { text: "room", link: "/client/block/room" },
              { text: "community", link: "/client/block/community" },
              { text: "list", link: "/client/block/list" },
              { text: "server", link: "/client/block/server" },
            ],
          },
          {
            text: "othres",
            link: "/client/othres",
            collapsed: false,
            items: [
              { text: "bgimage", link: "/client/othres/bgimage" },
              { text: "chart", link: "/client/othres/chart" },
              { text: "csrftoken", link: "/client/othres/csrftoken" },
              { text: " welcome", link: "/client/othres/welcome" },
            ],
          },
          {
            text: "websocket",
            link: "/client/websocket",
            items: [],
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
    ["link", { rel: "icon", href: "/favicon.ico" }],
  ],
});
