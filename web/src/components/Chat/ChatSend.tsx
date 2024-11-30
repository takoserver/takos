import { deviceKeyState, inputMessageState, isValidInputState } from "../../utils/state";
import { useAtom } from "solid-jotai";
import { createSignal } from "solid-js";
import { roomKeyState, selectedRoomState } from "../../utils/roomState";
import { encryptMessage } from "@takos/takos-encrypt-ink";
import { getLatestIdentityKey, localStorageEditor } from "../../utils/idb";
import { requester } from "../../utils/requester";
function ChatSend() {
  const [inputMessage, setInputMessage] = useAtom(inputMessageState);
  const [isValidInput, setIsValidInput] = useAtom(isValidInputState);
  const [roomKey, setRoomKey] = useAtom(roomKeyState);
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [deviceKey] = useAtom(deviceKeyState);
  const sendHandler = async () => {
    if(roomKey().length === 0) return;
    const message = inputMessage();
    setInputMessage("");
    const myLatestRoomKeyArray = roomKey().filter((room) => {
      return room.userId === localStorageEditor.get("userName") + "@" + localStorageEditor.get("server");
    });
    if (!myLatestRoomKeyArray) return;
    myLatestRoomKeyArray.sort((a, b) => {
      return JSON.parse(a.key).timestamp - JSON.parse(b.key).timestamp;
    });
    const myLatestRoomKey = myLatestRoomKeyArray[0]
    const latestIdentityKey = await getLatestIdentityKey(deviceKey() as string);
    const encryptedMessage = await encryptMessage(
      {
        type: "text",
        content: message,
        channel: "main",
        timestamp: new Date().getTime(),
        isLarge: false
      },
      myLatestRoomKey.key,
      {
        privateKey: latestIdentityKey?.private as string,
        pubKeyHash: latestIdentityKey?.hash as string,
      },
      selectedRoom()?.roomid as string,
    )
    const res = await requester(localStorageEditor.get("server") as string, "sendMessage", {
      roomid: selectedRoom()?.roomid,
      roomType: selectedRoom()?.type,
      message: encryptedMessage?.message,
      sign: encryptedMessage?.sign as string,
      sessionid: localStorageEditor.get("sessionid"),
    })
    if (res.status !== 200) {
      console.error("failed to send message");
      return;
    }
    const json = await res.json();
    console.log(json);
  };
  return (
    <div class="p-talk-chat-send">
      <form class="p-talk-chat-send__form">
        <div class="p-talk-chat-send__msg">
          <div
            class="p-talk-chat-send__dummy"
            aria-hidden="true"
          >
            {inputMessage().split("\n").map((row, index) => (
              <>
                {row}
                <br />
              </>
            ))}
          </div>
          <label>
            <textarea
              class="p-talk-chat-send__textarea"
              placeholder="メッセージを入力"
              value={inputMessage()}
              onInput={(e) => {
                if (e.target) {
                  //0文字以上の場合はtrue
                  setIsValidInput(e.target.value.length > 0);
                  setInputMessage(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendHandler();
                }
              }}
            >
            </textarea>
          </label>
        </div>
        <div
          class={isValidInput()
            ? "p-talk-chat-send__button is-active"
            : "p-talk-chat-send__button"}
          onClick={sendHandler}
        >
          <svg
            width="800px"
            height="800px"
            viewBox="0 0 28 28"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g stroke="none" stroke-width="1" fill="none">
              <g fill="#000000">
                <path d="M3.78963301,2.77233335 L24.8609339,12.8499121 C25.4837277,13.1477699 25.7471402,13.8941055 25.4492823,14.5168992 C25.326107,14.7744476 25.1184823,14.9820723 24.8609339,15.1052476 L3.78963301,25.1828263 C3.16683929,25.4806842 2.42050372,25.2172716 2.12264586,24.5944779 C1.99321184,24.3238431 1.96542524,24.015685 2.04435886,23.7262618 L4.15190935,15.9983421 C4.204709,15.8047375 4.36814355,15.6614577 4.56699265,15.634447 L14.7775879,14.2474874 C14.8655834,14.2349166 14.938494,14.177091 14.9721837,14.0981464 L14.9897199,14.0353553 C15.0064567,13.9181981 14.9390703,13.8084248 14.8334007,13.7671556 L14.7775879,13.7525126 L4.57894108,12.3655968 C4.38011873,12.3385589 4.21671819,12.1952832 4.16392965,12.0016992 L2.04435886,4.22889788 C1.8627142,3.56286745 2.25538645,2.87569101 2.92141688,2.69404635 C3.21084015,2.61511273 3.51899823,2.64289932 3.78963301,2.77233335 Z">
                </path>
              </g>
            </g>
          </svg>
        </div>
      </form>
    </div>
  );
}
export default ChatSend;
