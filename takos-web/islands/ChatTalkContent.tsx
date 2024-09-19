import ChatDate from "../components/ChatDate.tsx"
import ChatSendMessage from "../components/SendMessage.tsx"
import ChatOtherMessage from "../components/OtherMessage.tsx"
import { AppStateType } from "../util/types.ts"
import { splitUserName } from "../util/takosClient.ts"
interface Messages {
  messageid: string
  userName: string
  messages: string
  timestamp: string
  type: string
}

function ChatTalkMain({ state }: { state: AppStateType }) {
  let SendPrimary = true
  let OtherPrimary = true
  let DateState: any
  state.talkData.value.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })
  return (
    <>
      <div class="pl-2">
        {state.talkData.value.map((data, index) => {
          /*
        data: {
          message: string
          messageid: string
          timestamp: string
          type: string
          userName: string
        }
        */
          /*
        5分以上の間隔がある場合または8回連続の場合は日付を表示
        最初のメッセージは必ずisSendPrimary
        */
          if (data.userId === state.userId.value) {
            let a = false
            if (SendPrimary) {
              SendPrimary = false
              a = true
            }
            return (
              <ChatSendMessage
                key={index}
                isRead={false}
                isPrimary={false}
                message={data.message}
                isSendPrimary={a}
                time={data.timestamp}
              />
            )
          } else {
            let a = false
            if (OtherPrimary) {
              OtherPrimary = false
              a = true
            }
            return (
              <ChatOtherMessage
                key={index}
                isRead={false}
                isPrimary={true}
                message={data.message}
                isSendPrimary={true}
                time={data.timestamp}
                name={data.userId}
                nickName={"tako"}
              />
            )
          }
        })}
      </div>
    </>
  )
}

function ChatTalk({ state }: { state: AppStateType }) {
  if (state.isChoiceUser.value === true) {
    return (
      <ul className="c-talk-chat-list">
        <ChatTalkMain state={state} />
      </ul>
    )
  } else {
    return (
      <div className="flex w-full h-full">
        <p className="m-auto">友達を選択してください</p>
      </div>
    )
  }
}

export default ChatTalk
