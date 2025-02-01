import { useAtom } from "solid-jotai";
import { isSelectRoomState, selectedRoomState } from "../utils/roomState";

export default function TalkArea() {
  const [isSelectRoom, setIsSelectedRoom] = useAtom(isSelectRoomState);
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  return (
    <>
      <button
        class="p-talk-chat-prev"
        onClick={() => {
          setIsSelectedRoom(false);
          setSelectedRoom(null);
        }}
      >
        <svg
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          stroke="#000000"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        >
          <polyline points="14 18 8 12 14 6 14 6" />
        </svg>
      </button>
    </>
  );
}
