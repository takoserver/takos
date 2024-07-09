import User from "../components/User.tsx"
import { talkDataType } from "../util/types.ts"
import { useContext } from "preact/hooks"
import { AppState } from "../components/chat.tsx"
function TalkListContent({ page }: { page: any }) {
  const value = useContext(AppState)
  const { talkData } = value
  if (page.value === 0) {
    return <></>
  } else if (page.value === 1) {
    return (
      <>
        {talkData.value.map((talk: any) => {
          return (
            <User
              userName={talk.roomName}
              latestMessage={talk.latestMessage}
              icon={talk.icon}
              userName2={talk.userName}
              isNewMessage={talk.isNewMessage}
              isSelected={talk.isSelect}
            />
          )
        })}
      </>
    )
  }
  return <></>
}

export default TalkListContent
