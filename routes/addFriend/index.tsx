import users from "../../models/users.ts";
import { load } from "$std/dotenv/mod.ts";
import Chat from "../../components/chat.tsx";
const env = await load();
export const handler = {
  async GET(req: any, ctx: any) {
    if (!ctx.state.data.loggedIn) {
      return ctx.render({ loggedIn: false, isAddFriendForm: false });
    }
    const requrl = new URL(req.url);
    const key = requrl.searchParams.get("key") || "";
    if (key === "" || key === null || key === undefined) {
      return ctx.render({
        loggedIn: true,
        isAddFriendForm: false,
        userName: ctx.state.data.userName,
        userNickName: ctx.state.data.nickName,
      });
    }
    const userInfo = await users.findOne({ addFriendKey: key });
    if (userInfo === null || userInfo === undefined) {
      return ctx.render({
        loggedIn: true,
        isAddFriendForm: false,
        userName: ctx.state.data.userName,
        userNickName: ctx.state.data.nickName,
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
      });
    }
    return ctx.render({
      loggedIn: true,
      key,
      isAddFriendForm: false,
      userName: ctx.state.data.userName,
      userNickName: ctx.state.data.nickName,
    });
  },
};
export default function Home({ data }: { data: any }) {
  if (!data.loggedIn) {
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
          <div>
            this page is welcome page
          </div>
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
      <Chat page={2} userName={data.userName} />
    </>
  );
}
