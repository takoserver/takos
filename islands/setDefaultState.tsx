import { useEffect } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
import { setIschoiseUser } from "../util/takosClient.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list");
      const friendListJson = await friendListData.json();
      state.friendList.value = friendListJson.friends;
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
      switch (data.type) {
        case "connected":
          state.sessionid.value = data.sessionid;
          break;
        case "joined": {
          if(data.roomType === "friend"){
            state.roomType.value = "friend";
            const roomInfo = state.friendList.value.find((room: any) => room.userName === data.friendid);
            state.roomid.value = "";
            state.friendid.value = data.friendid;
            state.roomName.value = roomInfo.nickName;
            setIschoiseUser(true, state.isChoiceUser);
          }
        }
          break;
      }
    };
    state.ws.value.onopen = () => {
      console.log("connected");
    };
  }, []);
  return <></>;
}
