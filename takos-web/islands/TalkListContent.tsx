import User from "../components/User.tsx"
import { setIschoiseUser } from "../util/takosClient.ts"
import RequestFriendById from "./RequestFriendById.tsx"
import GetAddFriendKey from "./getAddFriendKey.tsx"
import FriendRequest from "./FriendRequest.tsx"
import { AppStateType } from "../util/types.ts"
import { useSignal } from "@preact/signals"
import { useEffect } from "preact/hooks"
import { createTakosDB } from "../util/idbSchama.ts"
import {
decryptDataRoomKey,
  decryptDataWithAccountKey,
  EncryptedDataAccountKey,
  EncryptedDataRoomKey,
  generateKeyHashHexJWK,
  Sign,
  verifyData,
  type RoomKey,
  type IdentityKeyPub,
} from "@takos/takos-encrypt-ink"
function TalkListContent({ state }: { state: AppStateType }) {
  if (state.page.value === 0) {
    return (
      <>
        <div class="flex items-center justify-between p-4">
          <div class="text-xs">
          </div>
          <div class="flex items-center space-x-4">
            <span class="material-icons">X</span>
            <span class="material-icons">X</span>
            <span class="material-icons">X</span>
          </div>
        </div>

        <div class="p-4">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center">
              <img
                src="/api/v2/client/users/icon"
                alt="Profile"
                class="rounded-full"
              />
            </div>
            <div>
              <h1 class="text-2xl font-bold">たこ</h1>
              <p class="text-sm">I'm full stack engineer</p>
              <p class="text-sm text-green-400">tako@localhost:8000</p>
            </div>
          </div>
        </div>

        <div class="p-4">
          <div class="mb-4">
            <input
              type="text"
              placeholder="検索"
              class="w-full p-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <h2 class="text-xl font-bold mb-2">友だちリスト</h2>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt="kuma"
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">誕生日が近い友だち</p>
                  <p class="text-xs text-gray-400">kuma</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt=""
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">お気に入り</p>
                  <p class="text-xs text-gray-400">いか</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt=""
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">友だち</p>
                  <p class="text-xs text-gray-400">たこ、かに、魚</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <img
                  src="https://via.placeholder.com/50"
                  alt="グループ"
                  class="w-10 h-10 rounded-full"
                />
                <div>
                  <p class="text-sm">グループ</p>
                  <p class="text-xs text-gray-400">魚介類同好会</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  } else if (state.page.value === 1) {
    return (
      <>
        {state.friendList.value.length === 0 &&
          (
            <>
              <User
                userName="友達がいません"
                latestMessage="友達を追加しましょう！"
                icon="/people.png"
                isNewMessage={false}
                isSelected={false}
                onClick={() => {
                  state.page.value = 2
                }}
              />
            </>
          )}
        {state.friendList.value.map((talk: any) => {
          console.log(talk.type)
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
                  )
                }}
              />
            )
          } else if (talk.type === "friend") {
            return (
              <User
                userName={talk.nickName}
                latestMessage={talk.latestMessage
                  ? talk.latestMessage.message
                  : "トーク履歴がありません"}
                icon={"/takos/v2/client/users/icon/friend?userName=" +
                  talk.userName}
                userName2={talk.userName}
                isNewMessage={talk.isNewMessage ? talk.isNewMessage : false}
                isSelected={talk.isSelect}
                onClick={async () => {
                  state.isChoiceUser.value = true
                  state.roomName.value = talk.nickName
                  state.friendid.value = talk.userName
                  setIschoiseUser(true, state.isChoiceUser)
                  state.roomType.value = "friend"
                  const talkData = await fetch(
                    "/takos/v2/client/talk/data/" + talk.userName + "/friend",
                  ).then((res) => res.json())
                  const roomKeys: RoomKey[] = (await Promise.all(
                    talkData.keys.map(async (key: EncryptedDataAccountKey) => {
                      const encryptedAccountKeyHash = key.encryptedKeyHashHex
                      const accountKey = state.IdentityKeyAndAccountKeys.value
                        .find(
                          (key2: { hashHex: string }) => key2.hashHex === encryptedAccountKeyHash,
                        )
                      if (!accountKey) {
                        return
                      }
                      const decryptedRoomKeyString = await decryptDataWithAccountKey(
                        accountKey.accountKey,
                        key,
                      )
                      if (!decryptedRoomKeyString) {
                        return
                      }
                      return JSON.parse(decryptedRoomKeyString)
                    }),
                  )).filter((key) => {
                    if (key) {
                      return true
                    }
                    return false
                  })
                  const resultRoomKeyArray: { key: RoomKey; hashHex: string }[] = await Promise.all(
                    roomKeys.map(async (key: RoomKey) => {
                      const hashHex = await generateKeyHashHexJWK(key);
                      if (hashHex === key.hashHex) {
                        return {
                          key: key,
                          hashHex: key.hashHex,
                        };
                      }
                      return null;
                    })
                  ).then(results => results.filter(result => result !== null) as { key: RoomKey; hashHex: string }[]);
                  state.roomKey.value = resultRoomKeyArray;
                  console.log(talkData);
                  state.talkData.value = await Promise.all(
                    talkData.messages.map(async (message: {
                      message: { value: EncryptedDataRoomKey, signature: Sign },
                      messageid: string,
                      timestamp: string,
                      userId: string,
                    }) => {
                      const roomKey = resultRoomKeyArray.find((key) => {
                        return String(message.message.value.encryptedKeyHashHex) === key.hashHex;
                      })?.key;
                      if (!roomKey) {
                        console.log(resultRoomKeyArray);
                        console.log(message.message.value.encryptedKeyHashHex);
                        console.log("roomKey not found");
                        return;
                      }
                      const decryptedMessage = await decryptDataRoomKey(
                        roomKey,
                        message.message.value,
                      );
                      if (!decryptedMessage) {
                        return;
                      }
                      const obj = JSON.parse(decryptedMessage);
                      const userIdentityKey: IdentityKeyPub[] = talkData.identityKeys[message.userId];
                      console.log(userIdentityKey);
                      if (!userIdentityKey) {
                        return;
                      }
                      const identityKey = userIdentityKey.find(async (key) => await generateKeyHashHexJWK(key) === obj.hashHex)
                      if (!identityKey) {
                        console.log("identityKey not found");
                        return;
                      }
                      const verify = verifyData(
                        identityKey,
                        message.message.value,
                        message.message.signature,
                      );
                      return {
                        messageid: message.messageid,
                        userName: message.userId,
                        message: obj.message,
                        timestamp: message.timestamp,
                        type: obj.type,
                      };
                    })
                  );
                  console.log(state.talkData.value);
                  state.ws.value?.send(
                    JSON.stringify({
                      type: "joinFriend",
                      sessionid: state.sessionid.value,
                      friendid: talk.userName,
                    }),
                  );
                }}
              />
            )
          }
        })}
      </>
    )
  } else if (state.page.value === 2) {
    return (
      <>
        <FriendRequest
          state={state}
        >
        </FriendRequest>
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
    )
  } else if (state.page.value === 3) {
    const settingPage = useSignal(0)
    return (
      <>
        <h1 class="text-lg">設定</h1>
        <User
          userName="プロフィール"
          latestMessage="プロフィールを編集します"
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={() => {
            settingPage.value = 1
          }}
        />
        <User
          userName="その他"
          latestMessage=""
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={() => {
            settingPage.value = 2
          }}
        />
        <User
          userName="ログアウト"
          latestMessage="ログアウトします"
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={async () => {
            const res = await fetch("/takos/v2/client/sessions/logout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            })
            const json = await res.json()
            if (json.status === true) {
              const db = await createTakosDB()
              await db.clear("deviceKey")
              await db.clear("keyShareKeys")
              await db.clear("masterKey")
              await db.clear("config")
              await db.clear("allowKeys")
              await db.clear("identityAndAccountKeys")
              window.location.href = "/"
            }
            //indexedDBから削除
          }}
        />
        {settingPage.value === 2 && <OtherSettingPage settingPage={settingPage} />}
        {settingPage.value === 1 && (
          <>
            <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      settingPage.value = 0
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="w-4/5 mx-auto my-auto mt-10"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const inputFormData = new FormData(
                      e.target as HTMLFormElement,
                    )
                    const nickName = inputFormData.get("nickName") as string
                    const icon = inputFormData.get("icon") as File
                    if (nickName === "" && icon.name === "") {
                      alert("いずれかの項目を入力してください")
                      return
                    }
                    const info = {
                      nickName: false,
                      icon: false,
                    }
                    if (nickName !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      )
                      const csrftoken = await csrftokenReq.json()
                      const res = await fetch(
                        "/api/v2/client/settings/nickname",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            nickName: nickName,
                            csrftoken: csrftoken.csrftoken,
                          }),
                        },
                      )
                      const result = await res.json()
                      console.log(result)
                      if (result.status === true) {
                        info.nickName = true
                      }
                    }
                    if (icon.name !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      )
                      const csrftoken = await csrftokenReq.json()
                      const formData = new FormData()
                      formData.append("icon", icon)
                      formData.append("csrftoken", csrftoken.csrftoken)
                      const res = await fetch("/api/v2/client/settings/icon", {
                        method: "POST",
                        body: formData,
                      })
                      const result = await res.json()
                      if (result.status === true) {
                        info.icon = true
                      }
                    }
                    if (icon.name !== "" && nickName !== "") {
                      if (info.nickName === true && info.icon === true) {
                        alert("保存しました")
                        settingPage.value = 0
                        //リロード
                        window.location.href = "/setting"
                      }
                      if (info.nickName === false && info.icon === true) {
                        alert("ニックネームの保存に失敗しました")
                      }
                      if (info.nickName === true && info.icon === false) {
                        alert("アイコンの保存に失敗しました")
                      }
                      if (info.nickName === false && info.icon === false) {
                        alert("保存に失敗しました")
                      }
                    }
                  }}
                >
                  <div class="text-center text-sm">
                    <p class="text-black dark:text-white hover:underline font-medium text-3xl mt-4 mb-5">
                      プロフィールの設定
                    </p>
                  </div>
                  <div>
                    <div class="lg:w-1/2 m-auto text-black dark:text-white lg:flex">
                      <img
                        src="/api/v2/client/users/icon"
                        alt=""
                        class="rounded-full lg:w-1/3 w-2/3 m-auto max-w-xs"
                      />
                      <div class="m-auto">
                        <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 dark:text-white">
                            ニックネーム
                          </label>
                          <input
                            type="text"
                            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            placeholder="ニックネームを入力してください"
                            name="nickName"
                            multiple
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-sm font-medium text-gray-700 dark:text-white">
                            アイコン
                          </label>
                          <input
                            type="file"
                            class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            accept="image/*"
                            name="icon"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="text-center">
                    <button
                      class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                      type="submit"
                    >
                      保存
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </>
    )
  }
  return <></>
}
function OtherSettingPage({ settingPage }: { settingPage: any }) {
  const addFriendById = useSignal(false)
  const allowOtherServerUsers = useSignal(false)
  useEffect(() => {
    async function run() {
      const res = await fetch("/api/v2/client/users/settings")
      const json = await res.json()
      addFriendById.value = json.settings.addFriendById
      allowOtherServerUsers.value = json.settings.allowOtherServerUsers
    }
    run()
  }, [])
  return (
    <>
      <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                settingPage.value = 0
              }}
            >
              ×
            </span>
          </div>
          <div class="w-4/5 mx-auto my-auto mt-10 h-full space-y-8 text-center">
            <h1 class="text-center text-2xl text-black dark:text-white hover:underline font-medium">
              その他の設定
            </h1>
            <div class="mt-12">
              <div class="flex mx-auto lg:w-2/3 w-full mb-4">
                <div class="ml-0 w-1/2">
                  <p class="text-center">他のサーバーのユーザーを許可</p>
                </div>
                <div class="w-1/2 flex">
                  <label class="inline-flex items-center cursor-pointer mx-auto">
                    <input
                      type="checkbox"
                      checked={addFriendById.value}
                      class="sr-only peer"
                      onChange={() => {
                        addFriendById.value = !addFriendById.value
                      }}
                    />
                    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                  </label>
                </div>
              </div>
              <div class="flex mx-auto lg:w-2/3 w-full">
                <div class="ml-0 w-1/2">
                  <p class="text-center">idによる追加を許可</p>
                </div>
                <div class="w-1/2 flex">
                  <label class="inline-flex items-center cursor-pointer mx-auto">
                    <input
                      type="checkbox"
                      checked={allowOtherServerUsers.value}
                      class="sr-only peer"
                      onChange={() => {
                        allowOtherServerUsers.value = !allowOtherServerUsers
                          .value
                      }}
                    />
                    <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div class="flex">
              <button
                type="submit"
                class="rounded-lg mx-auto text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                onClick={async () => {
                  const csrftokenRes = await fetch("/api/v2/client/csrftoken")
                  const csrftokenJson = await csrftokenRes.json()
                  const csrftoken = csrftokenJson.csrftoken
                  const res = await fetch("/api/v2/client/settings/privacy", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      setting: {
                        addFriendById: addFriendById.value,
                        allowOtherServerUsers: allowOtherServerUsers.value,
                      },
                      csrftoken: csrftoken,
                    }),
                  })
                  const json = await res.json()
                  if (!json.status) {
                    alert("エラーが発生しました")
                    return
                  }
                  alert("保存しました")
                }}
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default TalkListContent
