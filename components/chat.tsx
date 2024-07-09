import Header from "../components/header.tsx"
import TalkListHeader from "../islands/talkListHeader.tsx"
import TalkListContent from "../islands/TalkListContent.tsx"
import { signal } from "@preact/signals"
import { createContext } from "preact"
import { useContext } from "preact/hooks"
import { AppStateType } from "../util/types.ts"
import Main from "./chatmain.tsx"
function createAppState(userName?: any): AppStateType {
  const isChoiceUser = signal(false)
  const ws = signal(null)
  const talkData = signal([])
  const roomid = signal("")
  const sessionid = signal("")
  const friendList = signal([])
  const userNameResult = userName ? userName : null
  return {
    isChoiceUser: isChoiceUser,
    ws: ws,
    talkData: talkData,
    roomid: roomid,
    sessionid: sessionid,
    userName: userNameResult,
    friendList: friendList,
  }
}
export const AppState = createContext(createAppState())
function chat(props: { page: any; userName: string }) {
  console.log(props.page)
  const page = signal(props.page)
  console.log("this is" + page.value)
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
      <AppState.Provider value={createAppState()}>
        <App page={page} userName={props.userName} />
      </AppState.Provider>
    </>
  )
}
function App({ page, userName }: { page: any; userName: string }) {
  return (
    <>
      <Header page={page} />
      <div class="wrapper w-full">
        <main
          class="p-talk"
          id="chatmain"
        >
          <div class="p-talk-list">
            <TalkListHeader page={page} />
            <div class="p-talk-list-rooms">
              <ul class="p-talk-list-rooms__ul">
                <TalkListContent page={page} />
              </ul>
            </div>
          </div>
          <div class="p-talk-chat">
            <div class="p-talk-chat-container">
              <Main userName={userName}>
              </Main>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
export default chat
