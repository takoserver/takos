import User from "../components/User.tsx";
import { setIschoiseUser } from "../util/takosClient.ts";
import RequestFriendById from "./RequestFriendById.tsx";
import GetAddFriendKey from "./getAddFriendKey.tsx";
import FriendRequest from "./FriendRequest.tsx";
import { AppStateType } from "../util/types.ts";
import { Signal, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { createTakosDB } from "../util/idbSchama.ts";
import fnv1a from "@sindresorhus/fnv1a";
import {
  generateKeyHashHexJWK,
  type IdentityKeyPub,
  isValidMasterKeyTimeStamp,
  MasterKey,
  MasterKeyPub,
} from "@takos/takos-encrypt-ink";
import { saveToDbAllowKeys } from "../util/idbSchama.ts";
import { addMessage } from "../util/talkData.ts";
import { ifTopEventListener, mostButtom } from "../util/messageDOM.ts";
function TalkListContent({ state }: { state: AppStateType }) {
  async function handleFriendRoomSetup(
    talk: { nickName: string; userName: string; roomID: string },
  ) {
    const { nickName, userName, roomID } = talk;
    console.log(userName);
    // Update state
    state.isChoiceUser.value = true;
    state.roomName.value = nickName;
    state.friendid.value = userName;
    setIschoiseUser(true, state.isChoiceUser);
    state.roomType.value = "friend";

    // Fetch talk data
    const talkData = await fetch(`/takos/v2/client/talk/data/friend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userName,
      }),
    }).then((res) => res.json());
    console.log(talkData);
    state.talkData.value = [];
    await addMessage(state, talkData, {
      roomType: "friend",
      friendid: userName,
      roomid: roomID,
      myUserId: state.userName.value,
    });
    setTimeout(() => {
      mostButtom();
    }, 100);
    ifTopEventListener(
      async () => {
        const oldestMessage = state.talkData.value[0];
        const talkData = await fetch(`/takos/v2/client/talk/data/friend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userName,
            before: oldestMessage.messageid,
            ignoreKeys: (() => {
              const roomKeys = state.friendKeyCache.roomKey.value;
              const hashHexArray = roomKeys.map((key) => key.roomKey.hashHex);
              return hashHexArray;
            })(),
            ignoreMasterKeys: (() => {
              const masterKeys = state.friendKeyCache.masterKey.value;
              return masterKeys.map((key) => key.hashHex);
            })(),
            ignoreIdentityKeys: (() => {
              const identityKeys = state.friendKeyCache.identityKey.value;
              const hashHexArray = identityKeys.map((key) => key.hashHex);
              return hashHexArray;
            })(),
          }),
        }).then((res) => res.json());
        await addMessage(state, talkData, {
          roomType: "friend",
          friendid: userName,
          roomid: roomID,
          myUserId: state.userName.value,
        });
      },
    );
    state.ws.value?.send(
      JSON.stringify({
        type: "joinFriend",
        sessionid: state.sessionid.value,
        friendid: userName,
      }),
    );
  }

  // Helper function to find identity key by hash
  function findIdentityKey(identityKeys: IdentityKeyPub[], hashHex: string) {
    return identityKeys.find(async (key) =>
      await generateKeyHashHexJWK(key) === hashHex
    );
  }
  async function findMasterKey(masterKeys: {
    masterKey: MasterKeyPub;
    hashHex: string;
  }[], hashHex: string) {
    const reuslt = masterKeys.find(
      (key) => key.hashHex === hashHex,
    );
    if (!reuslt) {
      return null;
    }
    if (hashHex === await generateKeyHashHexJWK(reuslt.masterKey)) {
      return reuslt;
    }
    return null;
  }
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
    );
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
                  state.page.value = 2;
                }}
              />
            </>
          )}
        {state.friendList.value.map((talk: any) => {
          console.log(talk.type);
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
                  );
                }}
              />
            );
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
                  handleFriendRoomSetup(talk);
                }}
              />
            );
          }
        })}
      </>
    );
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
    );
  } else if (state.page.value === 3) {
    const settingPage = useSignal(0);
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
            settingPage.value = 1;
          }}
        />
        <User
          userName="その他"
          latestMessage=""
          icon="/people.png"
          isNewMessage={false}
          isSelected={false}
          onClick={() => {
            settingPage.value = 2;
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
            });
            const json = await res.json();
            if (json.status === true) {
              const db = await createTakosDB();
              await db.clear("deviceKey");
              await db.clear("keyShareKeys");
              await db.clear("masterKey");
              await db.clear("config");
              await db.clear("allowKeys");
              await db.clear("identityAndAccountKeys");
              window.location.href = "/";
            }
            //indexedDBから削除
          }}
        />
        {settingPage.value === 2 && (
          <OtherSettingPage settingPage={settingPage} />
        )}
        {settingPage.value === 1 && (
          <>
            <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      settingPage.value = 0;
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="w-4/5 mx-auto my-auto mt-10"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const inputFormData = new FormData(
                      e.target as HTMLFormElement,
                    );
                    const nickName = inputFormData.get("nickName") as string;
                    const icon = inputFormData.get("icon") as File;
                    if (nickName === "" && icon.name === "") {
                      alert("いずれかの項目を入力してください");
                      return;
                    }
                    const info = {
                      nickName: false,
                      icon: false,
                    };
                    if (nickName !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      );
                      const csrftoken = await csrftokenReq.json();
                      const res = await fetch(
                        "/api/v2/client/settings/nickname",
                        {
                          method: "POST",
                          body: JSON.stringify({
                            nickName: nickName,
                            csrftoken: csrftoken.csrftoken,
                          }),
                        },
                      );
                      const result = await res.json();
                      console.log(result);
                      if (result.status === true) {
                        info.nickName = true;
                      }
                    }
                    if (icon.name !== "") {
                      const csrftokenReq = await fetch(
                        "/api/v2/client/csrftoken",
                        {
                          method: "GET",
                        },
                      );
                      const csrftoken = await csrftokenReq.json();
                      const formData = new FormData();
                      formData.append("icon", icon);
                      formData.append("csrftoken", csrftoken.csrftoken);
                      const res = await fetch("/api/v2/client/settings/icon", {
                        method: "POST",
                        body: formData,
                      });
                      const result = await res.json();
                      if (result.status === true) {
                        info.icon = true;
                      }
                    }
                    if (icon.name !== "" && nickName !== "") {
                      if (info.nickName === true && info.icon === true) {
                        alert("保存しました");
                        settingPage.value = 0;
                        //リロード
                        window.location.href = "/setting";
                      }
                      if (info.nickName === false && info.icon === true) {
                        alert("ニックネームの保存に失敗しました");
                      }
                      if (info.nickName === true && info.icon === false) {
                        alert("アイコンの保存に失敗しました");
                      }
                      if (info.nickName === false && info.icon === false) {
                        alert("保存に失敗しました");
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
    );
  } else if (state.page.value === 4) {
    const db = createTakosDB();
    const verifyedKeyListState = useSignal(true);
    const verifyedKeyList: Signal<{
      keyHash: string;
      type: "allow" | "recognition";
      timestamp: string;
      userId: string;
    }[]> = useSignal([]);
    const noVerifyedKeyListState = useSignal(true);
    const noVerifyedKeyList: Signal<{
      keyHash: string;
      type: "allow" | "recognition";
      timestamp: string;
      userId: string;
    }[]> = useSignal([]);
    const isAllowedMyServer = useSignal(false);
    const myServerDomain = state.userId.value.split("@")[1];
    useEffect(() => {
      async function run() {
        const db = await createTakosDB();
        const res = await db.getAll("allowKeys");
        isAllowedMyServer.value = !!db.get("allowServers", myServerDomain);
        const KeysVerifyInfo: {
          [key: string]: {
            keyHash: string;
            type: "allow" | "recognition";
            timestamp: string;
          }[];
        } = {};
        for (const key of res) {
          const { allowedUserId: userId, keyHash, type, timestamp } = key;
          if (!KeysVerifyInfo[userId]) {
            KeysVerifyInfo[userId] = [];
          }
          KeysVerifyInfo[userId].push({ keyHash, type, timestamp });
        }
        // update user MasterKey
        const requestBody: {
          userId: string;
          hashHex: string;
        }[] = [];
        for (const key in KeysVerifyInfo) {
          const value = KeysVerifyInfo[key];
          value.sort((a, b) => {
            return new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime();
          });
          const latestKey = value[0];
          requestBody.push({
            userId: key,
            hashHex: latestKey.keyHash,
          });
        }
        const res2 = await fetch("/takos/v2/client/users/keys/masterKeys", {
          method: "POST",
          body: JSON.stringify(requestBody),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const json = await res2.json();
        const res2Result: {
          [key: string]: {
            masterKey: MasterKeyPub;
            hashHex: string;
          }[];
        } = json.masterKeys;
        for (const key in KeysVerifyInfo) {
          const value = KeysVerifyInfo[key];
          const masterKeys = res2Result[key];
          if (!masterKeys) {
            continue;
          }
          if (masterKeys.length === 0) {
            continue;
          }
          for (const masterKey of masterKeys) {
            if (!isValidMasterKeyTimeStamp(masterKey.masterKey)) {
              continue;
            }
            await saveToDbAllowKeys(
              await generateKeyHashHexJWK(masterKey.masterKey),
              key,
              "recognition",
              masterKey.masterKey.timestamp,
              state,
              true,
            );
          }
        }
        const allowKeys = await db.getAll("allowKeys");
        const tempKeyList: {
          [key: string]: {
            keyHash: string;
            type: "allow" | "recognition";
            timestamp: string;
            userId: string;
          }[];
        } = {};
        const verifyedKeyList2: {
          keyHash: string;
          type: "allow" | "recognition";
          timestamp: string;
          userId: string;
        }[] = [];
        const noVerifyedKeyList2: {
          keyHash: string;
          type: "allow" | "recognition";
          timestamp: string;
          userId: string;
        }[] = [];
        for (const key of allowKeys) {
          const { allowedUserId: userId, keyHash, type, timestamp } = key;
          if (!tempKeyList[userId]) {
            tempKeyList[userId] = [];
          }
          tempKeyList[userId].push({ keyHash, type, timestamp, userId });
        }
        for (const key in tempKeyList) {
          const value = tempKeyList[key];
          value.sort((a, b) => {
            return new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime();
          });
          const latestKey = value[0];
          if (latestKey.type === "allow") {
            verifyedKeyList2.push(latestKey);
          } else {
            noVerifyedKeyList2.push(latestKey);
          }
        }
        verifyedKeyList.value = verifyedKeyList2;
        noVerifyedKeyList.value = noVerifyedKeyList2;
        console.log(verifyedKeyList2);
        console.log(noVerifyedKeyList2);
      }
      run();
    }, []);
    const isVaildFriendMasterKeyInfo: Signal<
      {
        userId: string;
        latestHashHex: string;
        type: "checkHash";
        myMasterKeyHashHex: string;
      } | null
    > = useSignal(null);
    const isShowCheckForm: Signal<boolean> = useSignal(false);
    const isShowCheckCreditServerForm: Signal<boolean> = useSignal(false);
    const isShowCheckCreditMasterKeyForm: Signal<boolean> = useSignal(false);
    return (
      <>
        <div class="p-talk-list-search">
          <form name="talk-search">
            <label>
              <input
                type="text"
                placeholder="検索"
              />
            </label>
          </form>
        </div>
        <div class="flex">
          {noVerifyedKeyListState.value && (
            <svg
              version="1.1"
              id="_x32_"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 512 512"
              xml:space="preserve"
              class={"w-6 h-6"}
              onClick={() => {
                noVerifyedKeyListState.value = !noVerifyedKeyListState.value;
              }}
            >
              <style jsx>
                {`
        .st0 { fill: #fffff; }
            `}
              </style>
              <g>
                <polygon
                  class="st0"
                  points="440.189,92.085 256.019,276.255 71.83,92.085 0,163.915 256.019,419.915 512,163.915 	"
                  style="fill: rgb(255,255,255);"
                >
                </polygon>
              </g>
            </svg>
          )}
          {!noVerifyedKeyListState.value && (
            <svg
              version="1.1"
              id="_x32_"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 512 512"
              xml:space="preserve"
              class={"w-6 h-6"}
              onClick={() => {
                noVerifyedKeyListState.value = !noVerifyedKeyListState.value;
              }}
            >
              <style jsx>
                {`
              .st0 { fill: #ffffff; }
            `}
              </style>
              <g>
                <polygon
                  class="st0"
                  points="163.916,0 92.084,71.822 276.258,255.996 92.084,440.178 163.916,512 419.916,255.996 	"
                  style="fill: rgb(255,255,255);"
                >
                </polygon>
              </g>
            </svg>
          )}
          <p>未検証のユーザー</p>
        </div>
        {noVerifyedKeyListState.value && (
          <>
            {noVerifyedKeyList.value.map((key) => {
              return (
                <NoVerifyUser
                  icon="/people.png"
                  userName={key.userId}
                  acceptOnClick={async () => {
                    const myMasterKey: MasterKey = state.MasterKey.value;
                    const myMasterKeyHashHex = await generateKeyHashHexJWK(
                      myMasterKey.public,
                    );
                    isVaildFriendMasterKeyInfo.value = {
                      userId: key.userId,
                      latestHashHex: key.keyHash,
                      myMasterKeyHashHex,
                      type: "checkHash",
                    };
                    isShowCheckForm.value = true;
                  }}
                />
              );
            })}
          </>
        )}
        {isShowCheckForm.value && (
          <>
            <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[350px] w-full h-full rounded-xl shadow-lg relative p-5">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      isShowCheckForm.value = false;
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="h-full px-2 lg:px-3 flex flex-col"
                  onSubmit={async (e) => {
                    e.preventDefault();
                  }}
                >
                  <h1 class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                    鍵の検証
                  </h1>
                  <div class="w-full h-4/5">
                    <div class="flex h-1/2 w-full">
                      <div
                        class="m-auto bg-blue-500 p-2 rounded-lg text-white w-3/4 text-center"
                        onClick={() => {
                          isShowCheckCreditServerForm.value = true;
                          isShowCheckForm.value = false;
                        }}
                      >
                        サーバーを信頼
                      </div>
                    </div>
                    <div class="flex h-1/2 w-full">
                      <div
                        class="m-auto bg-blue-500 p-2 rounded-lg text-white w-3/4 text-center"
                        onClick={() => {
                          isShowCheckCreditMasterKeyForm.value = true;
                          isShowCheckForm.value = false;
                        }}
                      >
                        ハッシュ値の確認
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
        {isShowCheckCreditServerForm.value && (
          <>
            <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[350px] w-full h-full rounded-xl shadow-lg relative p-5">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      isShowCheckCreditServerForm.value = false;
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="h-full px-2 lg:px-3 flex flex-col"
                  onSubmit={async (e) => {
                    e.preventDefault();
                  }}
                >
                  <h1 class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                    サーバーを信頼
                  </h1>
                  <div class="flex h-1/2 w-full">
                    <div
                      class="m-auto bg-blue-500 p-2 rounded-lg text-white w-3/4 text-center"
                      onClick={async () => {
                        if (
                          !isAllowedMyServer.value ||
                          !isVaildFriendMasterKeyInfo.value
                        ) {
                          return;
                        }
                        await saveToDbAllowKeys(
                          isVaildFriendMasterKeyInfo.value.latestHashHex,
                          isVaildFriendMasterKeyInfo.value.userId,
                          "allow",
                          new Date().toISOString(),
                          state,
                          true,
                        );
                        isShowCheckCreditServerForm.value = false;
                        isShowCheckForm.value = false;
                      }}
                    >
                      このユーザーのみ
                    </div>
                  </div>
                  <div>
                    <h1 class="text-xl">信頼するサーバー</h1>
                    {(() => {
                      const result = [];
                      if (!isAllowedMyServer.value) {
                        result.push(myServerDomain);
                      }
                      result.push(
                        isVaildFriendMasterKeyInfo.value?.userId.split("@")[1],
                      );
                      return result.map((server) => {
                        return <p>{server}</p>;
                      });
                    })()}
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
        {isShowCheckCreditMasterKeyForm.value && (
          <>
            <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
              <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[400px] w-full h-full rounded-xl shadow-lg relative p-5">
                <div class="absolute right-0 top-0 p-4">
                  <span
                    class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                    onClick={() => {
                      isShowCheckCreditMasterKeyForm.value = false;
                    }}
                  >
                    ×
                  </span>
                </div>
                <form
                  class="h-full px-2 lg:px-3 flex flex-col"
                  onSubmit={async (e) => {
                    e.preventDefault();
                  }}
                >
                  <h1 class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                    鍵の検証
                  </h1>
                  <h2>相手のユーザーとこの値を見比べてください</h2>
                  {(() => {
                    if (!isVaildFriendMasterKeyInfo.value) {
                      return;
                    }
                    const hashHexs = [
                      {
                        hashHex: isVaildFriendMasterKeyInfo.value.latestHashHex,
                        userId: isVaildFriendMasterKeyInfo.value.userId,
                      },
                      {
                        hashHex:
                          isVaildFriendMasterKeyInfo.value.myMasterKeyHashHex,
                        userId: state.userId.value,
                      },
                    ];
                    return hashHexs.map((hash) => {
                      return (
                        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                          <p class="text-gray-700 dark:text-gray-300 font-semibold">
                            {hash.userId}
                          </p>
                          <p class="text-gray-500 dark:text-gray-400">
                            {fnv1a(hash.hashHex, { size: 32 })}
                          </p>
                        </div>
                      );
                    });
                  })()}
                  <div
                    class="m-auto bg-blue-500 p-2 rounded-lg text-white w-3/4 text-center"
                    onClick={async () => {
                      if (
                        !isAllowedMyServer.value ||
                        !isVaildFriendMasterKeyInfo.value
                      ) {
                        return;
                      }
                      await saveToDbAllowKeys(
                        isVaildFriendMasterKeyInfo.value.latestHashHex,
                        isVaildFriendMasterKeyInfo.value.userId,
                        "allow",
                        new Date().toISOString(),
                        state,
                        true,
                      );
                      isShowCheckCreditMasterKeyForm.value = false;
                      isShowCheckForm.value = false;
                      alert("信頼しました");
                    }}
                  >
                    信頼する
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
        <div class="flex">
          {verifyedKeyListState.value && (
            <svg
              version="1.1"
              id="_x32_"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 512 512"
              xml:space="preserve"
              class={"w-6 h-6"}
              onClick={() => {
                verifyedKeyListState.value = !verifyedKeyListState.value;
              }}
            >
              <style jsx>
                {`
        .st0 { fill: #fffff; }
            `}
              </style>
              <g>
                <polygon
                  class="st0"
                  points="440.189,92.085 256.019,276.255 71.83,92.085 0,163.915 256.019,419.915 512,163.915 	"
                  style="fill: rgb(255,255,255);"
                >
                </polygon>
              </g>
            </svg>
          )}
          {!verifyedKeyListState.value && (
            <svg
              version="1.1"
              id="_x32_"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              x="0px"
              y="0px"
              viewBox="0 0 512 512"
              xml:space="preserve"
              class={"w-6 h-6"}
              onClick={() => {
                verifyedKeyListState.value = !verifyedKeyListState.value;
              }}
            >
              <style jsx>
                {`
              .st0 { fill: #ffffff; }
            `}
              </style>
              <g>
                <polygon
                  class="st0"
                  points="163.916,0 92.084,71.822 276.258,255.996 92.084,440.178 163.916,512 419.916,255.996 	"
                  style="fill: rgb(255,255,255);"
                >
                </polygon>
              </g>
            </svg>
          )}
          <p>検証済みのユーザー</p>
        </div>
        {verifyedKeyListState.value && (
          <>
            {verifyedKeyList.value.map((key) => {
              if (state.userId.value === key.userId) {
                return <></>;
              }
              return (
                <VerifyUser
                  icon="/people.png"
                  userName={key.userId}
                />
              );
            })}
          </>
        )}
      </>
    );
  }
  return <></>;
}
function OtherSettingPage({ settingPage }: { settingPage: any }) {
  const addFriendById = useSignal(false);
  const allowOtherServerUsers = useSignal(false);
  useEffect(() => {
    async function run() {
      const res = await fetch("/api/v2/client/users/settings");
      const json = await res.json();
      addFriendById.value = json.settings.addFriendById;
      allowOtherServerUsers.value = json.settings.allowOtherServerUsers;
    }
    run();
  }, []);
  return (
    <>
      <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                settingPage.value = 0;
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
                        addFriendById.value = !addFriendById.value;
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
                          .value;
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
                  const csrftokenRes = await fetch("/api/v2/client/csrftoken");
                  const csrftokenJson = await csrftokenRes.json();
                  const csrftoken = csrftokenJson.csrftoken;
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
                  });
                  const json = await res.json();
                  if (!json.status) {
                    alert("エラーが発生しました");
                    return;
                  }
                  alert("保存しました");
                }}
              >
                更新
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default TalkListContent;

function NoVerifyUser(
  { icon, userName, acceptOnClick }: {
    icon: string;
    userName: string;
    acceptOnClick?: () => void;
  },
) {
  return (
    <>
      <li class="h-16 mb-3 w-full flex justify-between bg-white px-2.5 py-2 dark:bg-[#181818]">
        <a class="flex">
          <div class="c-talk-rooms-icon">
            <img src={icon} />
          </div>
          <div class="c-talk-rooms-box">
            <div class="c-talk-rooms-name">
              <p>{userName}</p>
            </div>
            <div class="c-talk-rooms-msg">
            </div>
          </div>
        </a>
        <div class="flex gap-1 items-center">
          <button
            class="
          bg-blue-500 p-2 rounded-md text-white
          "
            onClick={acceptOnClick}
          >
            検証
          </button>
        </div>
      </li>
    </>
  );
}
function VerifyUser(
  { icon, userName }: {
    icon: string;
    userName: string;
  },
) {
  return (
    <>
      <li class="h-16 mb-3 w-full flex justify-between bg-white px-2.5 py-2 dark:bg-[#181818]">
        <a class="flex">
          <div class="c-talk-rooms-icon">
            <img src={icon} />
          </div>
          <div class="c-talk-rooms-box">
            <div class="c-talk-rooms-name">
              <p>{userName}</p>
            </div>
            <div class="c-talk-rooms-msg">
            </div>
          </div>
        </a>
      </li>
    </>
  );
}
