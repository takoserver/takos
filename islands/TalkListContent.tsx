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
          return (
            <User
              userName={talk.roomName}
              latestMessage={talk.latestMessage}
              icon={talk.icon}
              userName2={talk.userName}
              isNewMessage={talk.isNewMessage}
              isSelected={talk.isSelect}
              onClick={() => {
                setIschoiseUser(true, state.isChoiceUser);
                state.roomid.value = talk.roomID;
                state.roomName.value = talk.roomName;
                console.log(talk.roomName);
                state.friendList.value.map((data: any) => {
                  if (data.roomID == talk.roomID) {
                    data.isNewMessage = false;
                  }
                });
                //urlの一番最後にroomidを追加
                //どのようなurlにも対応できるようにする
                const url = new URL(window.location.href);
                url.searchParams.set("roomid", talk.roomID);
                window.history.pushState({}, "", url.toString());
                state.ws.value?.send(
                  JSON.stringify({
                    type: "join",
                    sessionid: state.sessionid.value,
                    roomid: talk.roomID,
                  }),
                );
              }}
            />
          );
        })}
      </>
    );
  }
  return <></>;
}

export default TalkListContent;
