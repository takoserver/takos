import React from "preact/compat"
import { AppStateType } from "../util/types.ts"
import { encryptMessage, Message, RoomKey } from "@takos/takos-encrypt-ink"

function ChatSend({ state }: { state: AppStateType }) {
  const sendHandler = async () => {
    if (state.inputMessage.value) {
      if (
        state.inputMessage.value.length > 10000
      ) {
        alert(
          "100文字以内で入力してください",
        )
        return
      }
      const msg = state.inputMessage.value
      const roomKey: RoomKey | undefined = (() => {
        if (state.roomType.value === "friend") {
          const friendId = state.friendid.value
          const roomKeyList = state.friendKeyCache.roomKey.value.concat()
          const roomKey = roomKeyList.filter(
            (data) => data.userId === friendId,
          ).sort(
            (a, b) => {
              if (new Date(a.roomKey.timestamp) < new Date(b.roomKey.timestamp)) {
                return 1
              }
              if (new Date(a.roomKey.timestamp) > new Date(b.roomKey.timestamp)) {
                return -1
              }
              return 0
            },
          )[0]
          return roomKey.roomKey
        }
      })()
      const messageObj: Message = {
        message: msg,
        type: "text",
        version: 1,
        timestamp: new Date().toISOString(),
      }
      if (!roomKey) {
        return
      }
      const encryptedMessage = await encryptMessage(
        roomKey,
        state.IdentityKeyAndAccountKeys.value[0].identityKey,
        messageObj,
      )
      const res = fetch(
        `/takos/v2/client/talk/send/${state.roomType.value}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: encryptedMessage,
            friendId: state.friendid.value,
          }),
        },
      )
      res.then((res) => res.json()).then((res) => {
        if (res.status === false) {
          console.log(res.message)
          alert(
            "メッセージの送信に失敗しました",
          )
          return
        }
      })
      state.inputMessage.value = ""
      const friendList = state.friendList.value
      friendList.map(
        (
          data: any,
        ) => {
          if (
            data.roomid ==
              state.roomid.value
          ) {
            data.latestMessage = state.inputMessage.value
            data.latestMessageTime = new Date()
              .toString()
            data.isNewMessage = false
          }
        },
      )
      friendList.sort(
        (
          a: {
            latestMessageTime: number
          },
          b: {
            latestMessageTime: number
          },
        ) => {
          if (
            a.latestMessageTime <
              b.latestMessageTime
          ) {
            return 1
          }
          if (
            a.latestMessageTime >
              b.latestMessageTime
          ) {
            return -1
          }
          return 0
        },
      )
      state.friendList.value = friendList
    }
  }
  return (
    <div class="p-talk-chat-send">
      <form class="p-talk-chat-send__form">
        <div class="p-talk-chat-send__msg">
          <div
            class="p-talk-chat-send__dummy"
            aria-hidden="true"
          >
            {state.inputMessage.value.split("\n").map((row, index) => (
              <React.Fragment key={index}>
                {row}
                <br />
              </React.Fragment>
            ))}
          </div>
          <label>
            <textarea
              class="p-talk-chat-send__textarea"
              placeholder="メッセージを入力"
              value={state.inputMessage.value}
              onInput={(e) => {
                if (e.target) {
                  state.inputMessage.value = (e.target as HTMLTextAreaElement).value
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendHandler()
                }
              }}
            >
            </textarea>
          </label>
        </div>
        <div
          class={state.isValidInput.value
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
  )
}
export default ChatSend
