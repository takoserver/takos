import users from "../../../models/users.ts";
import { load } from "$std/dotenv/mod.ts";
import Chat from "../../../components/chat.tsx";
import Welcome from "../../../components/welcome.tsx";
import SetUp from "../../../islands/setup.tsx";
const env = await load();
export const handler = {
  async GET(req: any, ctx: any) {
    const name = ctx.params.name;
    if (!ctx.state.data.loggedIn) {
      if (ctx.state.data.isSetUp) {
        return ctx.render({ loggedIn: false, isAddFriendForm: false, isSetUp: true });
      }
      return ctx.render({ loggedIn: false, isAddFriendForm: false, isSetUp: false });
    }
    const requrl = new URL(req.url);
    const key = requrl.searchParams.get("key") || "";
    if (key === "" || key === null || key === undefined) {
      return ctx.render({
        loggedIn: true,
        isAddFriendForm: false,
        userName: ctx.state.data.userName,
        userNickName: ctx.state.data.nickName,
        name,
      });
    }
    const userInfo = await users.findOne({ addFriendKey: key });
    if (userInfo === null || userInfo === undefined) {
      return ctx.render({
        loggedIn: true,
        isAddFriendForm: false,
        userName: ctx.state.data.userName,
        userNickName: ctx.state.data.nickName,
        name,
      });
    }
    const sessionUserId: string = ctx.state.data.userid;
    const userInfoId: string = userInfo.uuid;
    if (sessionUserId != userInfoId) {
      return ctx.render({
        loggedIn: true,
        key,
        isAddFriendForm: true,
        userName: ctx.state.data.userName,
        userNickName: ctx.state.data.nickName,
        name,
      });
    }
    return ctx.render({
      loggedIn: true,
      key,
      isAddFriendForm: false,
      userName: ctx.state.data.userName,
      userNickName: ctx.state.data.nickName,
      name,
    });
  },
};
export default function Home({ data }: { data: any }) {
  if (!data.loggedIn) {
    if (data.isSetUp) {
      return (
        <>
          <head>
            <title>tako's | takos.jp</title>
            <meta
              name="description"
              content="日本産オープンソース分散型チャットアプリ「tako's」"
            />
            <link rel="stylesheet" href="/stylesheet.css"></link>
          </head>
          <SetUp />
        </>
      );
    }
    return (
      <>
        <>
          <head>
            <title>tako's | takos.jp</title>
            <meta
              name="description"
              content="日本産オープンソース分散型チャットアプリ「tako's」"
            />
            <link rel="stylesheet" href="/stylesheet.css"></link>
          </head>
          <Welcome></Welcome>
          {
            /*
          <Welcom sitekey={sitekey} />
           */
          }
        </>
      </>
    );
  }
  return (
    <>
      <Chat page={0} userName={data.userName} friendid={data.name} />
    </>
  );
}
