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
            text: "処理",
            link: "/protocol/process",
            collapsed: false,
          },
          {
            text: "rooms",
            link: "/protocol/room",
            collapsed: false,
          },
          {
            text: "foundation api",
            link: "/protocol/decentralized/server",
            collapsed: true,
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
                link:
                  "/protocol/decentralized/server/acceptRequestJoinPublicGroup",
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
                link: "/protocol/decentralized/client/getPublicGroupIcon",
              },
              {
                text: "publicGroupの名前を取得",
                link: "/protocol/decentralized/client/getPublicGroupName",
              },
              {
                text: "publicGroupの権限を取得",
                link: "/protocol/decentralized/client/getPublicGroupPermission",
              },
              {
                text: "publicGroupの説明を取得",
                link:
                  "/protocol/decentralized/client/getPublicGroupDescription",
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
                text: "serverのbackgroundImageを取得",
                link: "/protocol/decentralized/client/getServerBackgroundImage",
              },
              {
                text: "serverのiconを取得",
                link: "/protocol/decentralized/client/getServerIconImage",
              },
              {
                text: "serverの情報を取得",
                link: "/protocol/decentralized/client/getServerInfo",
              },
            ],
          },
        ],
      },
      {
        text: "takos web",
        collapsed: true,
        items: [
          {
            text: "sessions",
            link: "/takosWeb/sessions",
          },
          {
            text: "accept",
            link: "/takosWeb/accept",
          },
          {
            text: "reject",
            link: "/takosWeb/reject",
          },
          {
            text: "descriptionを変更するapi",
            link: "/takosWeb/changeDiscription",
          },
          {
            text: "iconを変更するapi",
            link: "/takosWeb/changeIcon",
          },
          {
            text: "nickNameを変更するapi",
            link: "/takosWeb/changeNickName",
          },
          {
            text: "groupのdescriptionを変更するapi",
            link: "/takosWeb/changeGroupDiscription",
          },
          {
            text: "groupのiconを変更するapi",
            link: "/takosWeb/changeGroupIcon",
          },
          {
            text: "groupのnameを変更するapi",
            link: "/takosWeb/changeGroupName",
          },
          {
            text: "publicGroupのdescriptionを変更するapi",
            link: "/takosWeb/changePublicGroupDescription",
          },
          {
            text: "publicGroupのiconを変更するapi",
            link: "/takosWeb/changePublicGroupIcon",
          },
          {
            text: "publicGroupのnameを変更するapi",
            link: "/takosWeb/changePublicGroupName",
          },
          {
            text: "groupを作成するapi",
            link: "/takosWeb/createGroup",
          },
          {
            text: "publicGroupを作成するapi",
            link: "/takosWeb/createPublicGroup",
          },
          {
            text: "デバイスキーを取得するapi",
            link: "/takosWeb/getDeviceKey",
          },
          {
            text: "profileを取得するapi",
            link: "/takosWeb/getProfile",
          },
          {
            text: "共有されたaccountKeyを取得するapi",
            link: "/takosWeb/getSharedAccountKey",
          },
          {
            text: "talkListを取得するapi",
            link: "/takosWeb/getTalkList",
          },
          {
            text: "groupに招待するapi",
            link: "/takosWeb/inviteGroup",
          },
          {
            text: "groupからキックするapi",
            link: "/takosWeb/kickGroup",
          },
          {
            text: "publicGroupからキックするapi",
            link: "/takosWeb/kickPublicGroup",
          },
          {
            text: "publicGroupの許可されたremoteServerのドメインを設定するapi",
            link: "/takosWeb/publicGroupAllowRemoteServer",
          },
          {
            text: "publicGroupに参加することをリクエストするapi",
            link: "/takosWeb/requestPublicGroup",
          },
          {
            text: "reCAPCHAトークンを取得するapi",
            link: "/takosWeb/reCAPCHA",
          },
          {
            text: "friend申請をするapi",
            link: "/takosWeb/requestFriend",
          },
          {
            text: "publicGroupに参加するリクエストを取得するapi",
            link: "/takosWeb/publicGroupRequests",
          },
          {
            text: "requestを取得するapi",
            link: "/takosWeb/requests",
          },
          {
            text: "messageを送信するapi",
            link: "/takosWeb/sendMessage",
          },
          {
            text: "accountKeyを更新するapi",
            link: "/takosWeb/updateAccountKey",
          },
          {
            text: "identityKeyを更新するapi",
            link: "/takosWeb/updateIdentityKey",
          },
          {
            text: "roomKeyを更新するapi",
            link: "/takosWeb/updateRoomKey",
          },
          {
            text: "shareKeyを更新するapi",
            link: "/takosWeb/updateShareKey",
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
    ["link", { rel: "icon", href: "/logo.png" }],
  ],
});
