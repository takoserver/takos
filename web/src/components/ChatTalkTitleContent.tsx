import { selectedRoomState } from "../utils/roomState";
import { createEffect } from "solid-js";
import { createSignal } from "solid-js";
import { useAtom } from "solid-jotai";
import { requester } from "../utils/requester";
import { domainState } from "../utils/state";
export default function ChatTalkTitleContent() {
  const [nickName, setNickName] = createSignal("選択してください");
  const [domain] = useAtom(domainState);
  const [selectedRoom] = useAtom(selectedRoomState);
  createEffect(async () => {
    if (selectedRoom() && selectedRoom()?.type === "friend") {
      const server = domain();
      if (!server) return;
      const nickNameResponse = await requester(server, "getFriendNickName", {
        userName: selectedRoom()?.roomName,
        sessionid: localStorage.getItem("sessionid"),
      });
      if (nickNameResponse.status) {
        return setNickName((await nickNameResponse.json()).nickName);
      }
    } else if (selectedRoom() && selectedRoom()?.type === "room") {
      return setNickName(selectedRoom()?.roomName || "");
    }
  });
  return <p>{nickName()}</p>;
}
