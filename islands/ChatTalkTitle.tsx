import { AppStateType } from "../util/types.ts"
export default function TalkArea({ state }: { state: AppStateType }) {
  return (
    <>
      <button
        class="p-talk-chat-prev"
        onClick={() => {
          if (state.isChoiceUser.value === null || state.ws.value === null || !(state.ws.value instanceof WebSocket)) {
            alert("websocketが接続されていません")
            return
          }
          state.ws.value.send(
            JSON.stringify({
              type: "leave",
              sessionid: state.sessionid.value,
            }),
          )
          state.isChoiceUser.value = false
          state.roomid.value = ""
          //urlを変更
          history.pushState("", "", "/talk")
        }}
      >
        <svg
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          stroke="#000000"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        >
          <polyline points="14 18 8 12 14 6 14 6" />
        </svg>
      </button>
    </>
  )
}
