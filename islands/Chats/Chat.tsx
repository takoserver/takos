import { useEffect, useState } from "preact/hooks"
import ChatHeader from "./ChatHeader.tsx"
import ChatList from "./ChatList.tsx"
import ChatTalk from "./ChatTalk.tsx"
import SettingList from "../SettingList.tsx"
import GetAddFriendKey from "./getAddFriendKey.tsx"
import FriendRequest from "./FriendRequest.tsx"
import User from "./AddFriend.tsx"
import RequestFriendById from "./RequestFriendById.tsx"
import messages from "../../models/messages.ts"
import React from "https://esm.sh/preact@10.22.0/compat"
import { setRenderState } from "$fresh/src/server/rendering/preact_hooks.ts"
type TalkDataItem = {
  type: string
  message: string
  id?: string // idが文字列であると仮定します。必要に応じて適切な型に変更してください。
  time: string
  isRead: boolean
  sender?: string
}
interface FriendList {
  roomName: string
  latestMessage: string
  icon: string
  roomid: string
  userName: string
  isNewMessage: boolean
  latestMessageTime: string | Date
}
export default function Home(
  props: any,
) {
  const [inputMessage, setInputMessage] = useState("")
  const [isValidInput, setIsValidInput] = useState(false)
  const [page, setPage] = useState(props.page)
  const [isChoiceUser, setIsChoiceUser] = useState(
    props.roomid !== undefined && props.roomid !== "",
  )
  const [roomid, setRoomid] = useState<string | null>(props.roomid)
  const [isShowAddFriendForm, setIsShowAddFriendForm] = useState(
    props.isAddFriendForm,
  )
  const [friendList, setFriendList] = useState<FriendList[]>([])
  const reset = () => {
    //setIsChoiceUser(false)
  }
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [sessionid, setSessionid] = useState("")
  const [roomName, setRoomName] = useState("")
  const [talkData, setTalkData] = useState<TalkDataItem[]>([])
  const sendHandler = () => {
    if (inputMessage) {
      if (
        inputMessage.length > 100
      ) {
        alert(
          "100文字以内で入力してください",
        )
        return
      }
      const data = {
        type: "message",
        message: inputMessage,
        roomid: roomid,
        sessionid: sessionid,
        messageType: "text",
      }
      ws?.send(
        JSON.stringify(
          data,
        ),
      )
      setInputMessage("")
      setFriendList(
        (prev: any) => {
          let temp = prev
          temp.map(
            (
              data: any,
            ) => {
              if (
                data.roomid ==
                  roomid
              ) {
                data.latestMessage = inputMessage
                data.latestMessageTime = new Date()
                  .toString()
                data.isNewMessage = false
              }
            },
          )
          temp.sort(
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
          return temp
        },
      )
    }
  }

  useEffect(() => {
    // 改行のみでないか
    if (inputMessage && !/^[\n]+$/.test(inputMessage) && inputMessage.length <= 100) setIsValidInput(true)
    else setIsValidInput(false)
  }, [inputMessage])

  useEffect(() => {
    if (roomid !== null && roomid !== undefined && roomid !== "") {
      const fetchData = async () => {
        const res = await fetch(
          `/api/v1/chats/talkdata?roomid=${roomid}&startChat=true`,
          {
            method: "GET",
          },
        )
        const data = await res.json()
        setRoomName(data.roomname)
        const defaultTalkData = data.messages.map((data: any) => {
          return {
            type: "message",
            message: data.message,
            time: data.timestamp,
            isRead: data.isRead,
            sender: data.sender,
            senderNickName: data.senderNickName,
            messageid: data.messageid,
            messageType: data.messageType,
          }
        })
        //時間順に並び替え
        defaultTalkData.sort((a: any, b: any) => {
          if (a.time < b.time) {
            return -1
          }
          if (a.time > b.time) {
            return 1
          }
          return 0
        })
        setTalkData(defaultTalkData)
      }
      fetchData()
    }
  }, [roomid])
  useEffect(() => {
    setTimeout(() => {
      const chatArea = document.getElementById("chat-area")
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight
      }
    }, 100)
  }, [talkData])
  useEffect(() => {
    const createWebSocket = () => {
      let wssprotocol
      if (window.location.protocol === "https:") {
        wssprotocol = "wss://"
      } else {
        wssprotocol = "ws://"
      }
      const origin = window.location.origin
      const domain = (new URL(origin)).host
      const wsurl = wssprotocol + domain + "/api/v1/main"
      const socket = new WebSocket(
        wsurl,
      )
      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "login",
          }),
        )
      }
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type == "login") {
          setSessionid(data.sessionID)
          if (props.roomid !== undefined && props.roomid !== "") {
            socket.send(JSON.stringify({
              type: "joinRoom",
              roomid: props.roomid,
              sessionid: data.sessionID,
            }))
          }
        } else if (data.type == "joinRoom") {
          setRoomid(data.roomID)
        } else if (data.type == "message") {
          setTalkData((prev) => {
            return [
              ...prev,
              {
                type: "message",
                message: data.message,
                time: data.time,
                isRead: false,
                sender: data.sender,
                senderNickName: data.senderNickName,
                messageid: data.messageid,
                messageType: data.messageType,
              },
            ]
          })
        } else if (data.type == "read") {
          console.log(data)
          setTalkData((prev) => {
            return prev.map((item) => {
              if (data.messageids.includes(item?.message)) {
                return {
                  ...item,
                  isRead: true,
                }
              }
              return item
            })
          })
        } else if (data.type == "notification") {
          //friendListを更新
          console.log(data)
          setFriendList((prev) => {
            const newFriendList = prev.map((item) => {
              if (item.roomid == data.roomid) {
                console.log("update")
                return {
                  ...item,
                  latestMessage: data.message,
                  latestMessageTime: data.time,
                  isNewMessage: true,
                }
              }
              return item
            })
            newFriendList.sort((a, b) => {
              if (a.latestMessageTime < b.latestMessageTime) {
                return 1
              }
              if (a.latestMessageTime > b.latestMessageTime) {
                return -1
              }
              return 0
            })
            return newFriendList
          })
        } else {
          if (data.status == false) {
            console.log(data.explain)
          }
        }
      }
      socket.onclose = () => {
        setTimeout(() => {
          const socket = createWebSocket()
          setWs(socket)
        }, 1000)
      }
      return socket
    }
    setWs(createWebSocket())
  }, [])
  return (
    <>
      {isShowAddFriendForm && (
        <AddFriendForm
          addFriendKey={props.AddFriendKey}
          setShowAddFriendForm={setIsShowAddFriendForm}
        />
      )}
      <ChatHeader
        page={page}
        setPage={setPage}
        reset={reset}
        isChoiceUser={isChoiceUser}
      />

      <div class="wrapper w-full">
        <main
          class={isChoiceUser ? "p-talk is-inview" : "p-talk"}
          id="chatmain"
        >
          {page === 1
            ? (
              <>
                <ChatList
                  friendList={friendList}
                  setFriendList={setFriendList}
                  setIsChoiceUser={setIsChoiceUser}
                  roomid={roomid}
                  ws={ws}
                  sessionid={sessionid}
                />
              </>
            )
            : null}
          {page === 2
            ? (
              <>
                <ChatAddFriendList />
              </>
            )
            : null}
          {page === 3
            ? (
              <>
                <Setting
                  setIsChoiceUser={setIsChoiceUser}
                />
              </>
            )
            : null}
          <div class="p-talk-chat">
            <div class="p-talk-chat-container">
              <ChatTalk
                isSelectUser={isChoiceUser}
                roomid={roomid}
                setFriendList={setFriendList}
                setIsChoiceUser={setIsChoiceUser}
                setRoomid={setRoomid}
                ws={ws}
                sessionid={sessionid}
                setSessionid={setSessionid}
                userName={props.userName}
                userNickName={props.userNickName}
                roomName={roomName}
                talkData={talkData}
              />
              {isChoiceUser && (
                <>
                  <div class="p-talk-chat-send">
                    <form class="p-talk-chat-send__form">
                      <div class="p-talk-chat-send__msg">
                        <div
                          class="p-talk-chat-send__dummy"
                          aria-hidden="true"
                        >
                          {inputMessage.split("\n").map((row, index) => (
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
                            value={inputMessage}
                            onInput={(e) => {
                              if (e.target) {
                                setInputMessage(
                                  (e.target as HTMLTextAreaElement).value,
                                )
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
                        class={isValidInput ? "p-talk-chat-send__button is-active" : "p-talk-chat-send__button"}
                        onClick={sendHandler}
                      >
                        <svg width="800px" height="800px" viewBox="0 0 28 28" version="1.1" xmlns="http://www.w3.org/2000/svg">
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
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
const Setting = (props: any) => {
  const [settingPage, setSettingPage] = useState("profile")
  return (
    <>
      <div class="p-talk-list">
        <h1 class="p-talk-list-title">設定</h1>
        <div class="p-talk-list-rooms">
          <ul class="p-talk-list-rooms__ul" id="friendList">
            <SettingList
              setSettingPage={setSettingPage}
              setIsChoiceUser={props.setIsChoiceUser}
            >
            </SettingList>
          </ul>
        </div>
      </div>
    </>
  )
}
function ChatAddFriendList(props: any) {
  return (
    <div class="p-talk-list">
      <h1 class="p-talk-list-title">友達を追加</h1>
      <div class="p-talk-list-rooms">
        <h1 class="text-lg">友達を追加</h1>
        <ul class="p-talk-list-rooms__ul" id="friendList">
          <RequestFriendById />
          <User userName="QRコードで追加" latestMessage="" />
          <GetAddFriendKey></GetAddFriendKey>
        </ul>
      </div>
      <div class="p-talk-list-rooms">
        <h1 class="text-lg">リクエスト</h1>
        <ul class="p-talk-list-rooms__ul" id="friendList">
          <FriendRequest></FriendRequest>
        </ul>
      </div>
    </div>
  )
}
const AddFriendForm = (
  props: {
    addFriendKey: string
    setShowAddFriendForm: (arg0: boolean) => void
  },
) => {
  const [addFriendInfo, setAddFriendInfo] = useState<{
    data: string
    icon: string
  }>({
    data: "",
    icon: "",
  })
  const [isRequested, setIsRequested] = useState(false)
  useEffect(() => {
    const fetchData = async () => {
      const addFriendKey = props.addFriendKey
      const addFriendInfoTemp = await fetch(
        "/api/v1/friends/" + addFriendKey + "/info",
        {
          method: "GET",
        },
      )
      const res = await addFriendInfoTemp.json()
      setAddFriendInfo(res)
    }
    fetchData()
  }, [])
  return (
    <>
      <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0">
        <div class="bg-[#f0f0f5] lg:w-1/3 w-full h-full lg:h-4/6 mx-auto lg:my-[6.5%] p-5 lg:rounded-xl">
          <div class="flex justify-end">
            <span
              class="ml-0 text-3xl text-gray-400 font-[bold] no-underline cursor-pointer"
              onClick={() => {
                props.setShowAddFriendForm(false)
                window.history.replaceState("", "", "/")
              }}
            >
              ×
            </span>
          </div>
          <div class="w-4/5 mx-auto my-0 text-black">
            <div class="w-full h-full text-center">
              <h1 class="text-3xl mb-10">友達申請を送信する</h1>
              <div class="w-full">
                {!isRequested &&
                  (
                    <>
                      <div class="text-lg">
                        {addFriendInfo.data}
                      </div>
                      <div class="w-2/3 m-auto mb-10">
                        <img
                          src={"/api/v1/friends/" +
                            props.addFriendKey +
                            "/icon?isuseAddFriendKey=true"}
                          alt=""
                          class="rounded-full mx-auto my-5"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          const origin = window.location
                            .protocol +
                            "//" +
                            window.location.host
                          const csrftokenRes = await fetch(
                            `/api/v1/csrftoken?origin=${origin}`,
                          )
                          const csrftoken = await csrftokenRes
                            .json()
                          const result = await fetch(
                            "/api/v1/friends/request",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON
                                .stringify({
                                  csrftoken: csrftoken
                                    .csrftoken,
                                  type: "AddFriendKey",
                                  addFriendKey: props
                                    .addFriendKey,
                                }),
                            },
                          )
                          const res = await result
                            .json()
                          if (
                            res.status == "success"
                          ) {
                            //
                            setIsRequested(true)
                          }
                        }}
                        type="submit"
                        class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                      >
                        申請する
                      </button>
                    </>
                  )}
                {isRequested &&
                  (
                    <>
                      <div>
                        そうしんできたで
                      </div>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
