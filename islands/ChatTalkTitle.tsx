import { useContext } from "preact/hooks"
import { AppState } from "../components/chat.tsx"
export default function TalkArea() {
  const value = useContext(AppState)
  const { isChoiceUser, ws, roomid, sessionid } = value
  return (
    <>
      <button
        class="p-talk-chat-prev"
        onClick={() => {
          if (isChoiceUser.value === null || ws.value === null || !(ws.value instanceof WebSocket)) {
            alert("websocketが接続されていません")
            return
          }
          ws.value.send(
            JSON.stringify({
              type: "leave",
              sessionid: sessionid.value,
            }),
          )
          isChoiceUser.value = false
          roomid.value = ""
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
