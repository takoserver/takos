import User from "../components/User.tsx";
import { setIschoiseUser } from "../util/takosClient.ts";
import { AppStateType } from "../util/types.ts";
function TalkListContent({ state }: { state: AppStateType }) {
  if (state.page.value === 0) {
    return <></>;
  } else if (state.page.value === 1) {
    return (
      <>
        {state.friendList.value.map((talk: any) => {
          console.log(talk);
          if (talk.type === "group") {
            return (
              <User
                userName={talk.roomName}
                latestMessage={talk.latestMessage}
                icon={talk.icon}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage}
                isSelected={talk.isSelect}
                onClick={() => {
                  state.ws.value?.send(
                    JSON.stringify({
                      type: "joinRoom",
                      sessionid: state.sessionid.value,
                      roomid: talk.roomID,
                    }),
                  );
                }}
              />
            );
          } else if (talk.type === "localfriend") {
            return (
              <User
                userName={talk.roomName}
                latestMessage={talk.latestMessage}
                icon={talk.icon}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage}
                isSelected={talk.isSelect}
                onClick={() => {
                  console.log(state.sessionid.value);
                  state.ws.value?.send(
                    JSON.stringify({
                      type: "joinFriend",
                      sessionid: state.sessionid.value,
                      roomid: talk.roomID,
                    }),
                  );
                }}
              />
            );
          }
        })}
      </>
    );
  }
  return <></>;
}

export default TalkListContent;
