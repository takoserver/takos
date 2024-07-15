import Header from "../components/header.tsx";
import TalkListHeader from "../islands/talkListHeader.tsx";
import TalkListContent from "../islands/TalkListContent.tsx";
import SetDefaultState from "../islands/setDefaultState.tsx";
import { effect, signal } from "@preact/signals";
import { createContext } from "preact";
import { AppStateType } from "../util/types.ts";
import Main from "./chatmain.tsx";
function createAppState(obj: {
  isChoiceUser: boolean;
  roomid: string;
  userName: string;
  page: number;
  friendid?: string;
}): AppStateType {
  const isChoiceUser = signal(obj.isChoiceUser);
  const ws = signal(null);
  const talkData = signal([]);
  const roomid = signal(obj.roomid);
  const sessionid = signal("");
  const friendList = signal([]);
  const roomName = signal("");
  const page = signal(obj.page);
  const inputMessage = signal("");
  const setIsValidInput = signal(false);
  const roomType = signal("");
  const friendid = signal(obj.friendid || "");
  return {
    isChoiceUser: isChoiceUser,
    ws: ws,
    talkData: talkData,
    roomid: roomid,
    sessionid: sessionid,
    userName: obj.userName,
    friendList: friendList,
    roomName: roomName,
    page: page,
    inputMessage: inputMessage,
    isValidInput: setIsValidInput,
    roomType: roomType,
    friendid: friendid,
  };
}
function chat(props: { page: any; userName: string,friendid?: string }) {
  const AppState = createAppState({
    isChoiceUser: false,
    roomid: "",
    userName: props.userName,
    page: props.page,
    friendid: props.friendid,
  });
  return (
    <>
      <head>
        <title>tako's | takos.jp</title>
        <meta
          name="description"
          content="日本産オープンソース分散型チャットアプリ「tako's」"
        />
        <link rel="stylesheet" href="/style.css"></link>
      </head>
      <App state={AppState} />
    </>
  );
}
function App({ state }: { state: AppStateType }) {
  return (
    <>
      <SetDefaultState state={state} />
      <Header state={state} />
      <div class="wrapper w-full">
        <main
          class="p-talk"
          id="chatmain"
        >
          <div class="p-talk-list">
            <TalkListHeader state={state} />
            <div class="p-talk-list-rooms">
              <ul class="p-talk-list-rooms__ul">
                <TalkListContent state={state} />
              </ul>
            </div>
          </div>
          <div class="p-talk-chat">
            <div class="p-talk-chat-container">
              <Main state={state}>
              </Main>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
export default chat;
