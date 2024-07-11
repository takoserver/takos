import User from "../components/User.tsx";
import { AppStateType } from "../util/types.ts";
function TalkListContent({ state }: { state: AppStateType }) {
  if (state.page.value === 0) {
    return <></>;
  } else if (state.page.value === 1) {
    return (
      <>
        {state.friendList.value.map((talk: any) => {
          return (
            <User
              userName={talk.roomName}
              latestMessage={talk.latestMessage}
              icon={talk.icon}
              userName2={talk.userName}
              isNewMessage={talk.isNewMessage}
              isSelected={talk.isSelect}
            />
          );
        })}
      </>
    );
  }
  return <></>;
}

export default TalkListContent;
