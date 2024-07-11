import { useEffect } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list");
      const friendListJson = await friendListData.json();
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
  return <></>;
}
