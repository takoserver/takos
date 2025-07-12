import { onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import { useAtom } from "solid-jotai";
import { selectedAppState } from "../states/app.ts";
import { selectedRoomState } from "../states/chat.ts";
import { Application } from "./Application.tsx";

export default function ChatRoomPage(
  props: { onShowEncryptionKeyForm?: () => void },
) {
  const params = useParams();
  const [, setSelectedApp] = useAtom(selectedAppState);
  const [, setRoom] = useAtom(selectedRoomState);
  onMount(() => {
    setSelectedApp("chat");
    setRoom(params.roomId);
  });
  return (
    <Application
      onShowEncryptionKeyForm={props.onShowEncryptionKeyForm}
    />
  );
}
