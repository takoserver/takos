import User from "../components/User.tsx";
import { setIschoiseUser } from "../util/takosClient.ts";
import RequestFriendById from "./RequestFriendById.tsx";
import GetAddFriendKey from "./getAddFriendKey.tsx";
import FriendRequest from "./FriendRequest.tsx";
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
          } else if (talk.type === "friend") {
            return (
              <User
                userName={talk.nickName}
                latestMessage={talk.latestMessage}
                icon={"http://" + talk.userName.split("@")[1] + "/api/v2/client/friends/info/" + talk.userName + "/icon/friend"}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage}
                isSelected={talk.isSelect}
                onClick={() => {
                  console.log(state.sessionid.value);
                  state.ws.value?.send(
                    JSON.stringify({
                      type: "joinFriend",
                      sessionid: state.sessionid.value,
                      friendid: talk.userName,
                    }),
                  );
                }}
              />
            );
          }
        })}
      </>
    );
  } else if (state.page.value === 2) {
    return (
      <>
        <FriendRequest></FriendRequest>
        <h1 class="text-lg">友達を追加</h1>
        <RequestFriendById />
        <User
          userName="QRコードで追加"
          latestMessage=""
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
        />
        <GetAddFriendKey />
      </>
    );
  }
  return <></>;
}

export default TalkListContent;
