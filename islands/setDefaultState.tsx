import { useEffect } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list");
      const friendListJson = await friendListData.json();
      console.log(friendListJson);
      const result = friendListJson.friends.map((friend: any) => {
        return {
          roomName: friend.roomName,
          latestMessage: friend.lastMessage,
          roomID: friend.roomID,
          latestMessageTime: friend.latestMessageTime,
          roomIcon: friend.roomIcon,
          type: friend.type,
          isNewMessage: friend.isNewMessage,
        };
      });
      state.friendList.value = result;
      console.log(state.friendList.value);
    }
    setDefaultState();
  }, []);
  useEffect(() => {
    if (state.inputMessage.value && !/^[\n]+$/.test(state.inputMessage.value) && state.inputMessage.value.length <= 100) {
      state.isValidInput.value = true;
    } else {
      state.isValidInput.value = false;
    }
  }, [state.inputMessage.value]);
  useEffect(() => {
    state.ws.value = new WebSocket("/api/v2/client/main");
    state.ws.value.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      console.log(data);
      switch (data.type) {
        case "connected":
          state.sessionid.value = data.sessionid;
          break;
      }
    };
    state.ws.value.onopen = () => {
      console.log("connected");
    };
  }, []);
  return <></>;
}
