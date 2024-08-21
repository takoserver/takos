import { useEffect, useState } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
import { setIschoiseUser } from "../util/takosClient.ts";
import { TakosDB } from "../util/idbSchama.ts";
import {
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createMasterKey,
  encryptDataDeviceKey,
} from "@takos/takos-encrypt-ink";
import { createTakosDB } from "../util/idbSchama.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  const [setUp, setSetUp] = useState(false);
  const [nickName, setNickName] = useState("");
  const [icon, setIcon] = useState<File | null>(null);
  const [age, setAge] = useState(0);
  useEffect(() => {
    //loginしているか、していたら基本情報を取得
    async function setDefaultState() {
      const userInfoData = await fetch("/takos/v2/client/profile").then((res) =>
        res.json()
      );
      if (!userInfoData.status) {
        window.location.href = "/";
      }
      if (!userInfoData.data.setup) {
        setSetUp(true);
      }
      state.userName.value = userInfoData.userName;

      const request = indexedDB.open("takos", 1);
    }
    setDefaultState();
  }, []);
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list");
      const friendListJson = await friendListData.json();
      state.friendList.value = friendListJson.friends;
    }
    setDefaultState();
  }, []);
  useEffect(() => {
    if (
      state.inputMessage.value && !/^[\n]+$/.test(state.inputMessage.value) &&
      state.inputMessage.value.length <= 100
    ) {
      state.isValidInput.value = true;
    } else {
      state.isValidInput.value = false;
    }
  }, [state.inputMessage.value]);
  useEffect(() => {
    state.ws.value = new WebSocket("/api/v2/client/main");
    state.ws.value.onopen = () => {
      console.log("connected");
    };
    state.ws.value.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "connected":
          state.sessionid.value = data.sessionid;
          if (state.friendid.value) {
            state.ws.value?.send(JSON.stringify({
              type: "joinFriend",
              sessionid: state.sessionid.value,
              friendid: state.friendid.value,
            }));
          }
          break;
        case "joined":
          {
            if (data.roomType === "friend") {
              state.roomType.value = "friend";
              const roomInfo = state.friendList.value.find((room: any) =>
                room.userName === data.friendid
              );
              state.roomid.value = "";
              state.friendid.value = data.friendid;
              state.roomName.value = roomInfo.nickName;
              setIschoiseUser(true, state.isChoiceUser);
              window.history.pushState(
                "",
                "",
                "/talk/friends/" + state.friendid.value,
              );
              const talkData = fetch(
                "/api/v2/client/talks/friend/data?friendid=" +
                  state.friendid.value + "&limit=50",
              );
              talkData.then((res) => res.json()).then((res) => {
                const data = res.data as any[];
                //timestamp順にソート
                data.sort((a, b) => {
                  return new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime();
                });
                state.talkData.value = data;
              });
            }
          }
          break;
        case "text": {
          console.log(data);
          const message = {
            messageid: data.messageid,
            type: "text",
            message: data.message,
            userName: data.userName,
            timestamp: data.time,
            read: [],
          };
          const result = state.talkData.value.concat(message);
          result.sort((a, b) => {
            return new Date(a.timestamp).getTime() -
              new Date(b.timestamp).getTime();
          });
          state.talkData.value = result;
          break;
        }
      }
    };
  }, []);
  return (
    <>
      {setUp && (
        <div class="fixed z-50 w-full h-full bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 w-full h-full p-5 rounded-xl shadow-lg relative md:ml-[78px]">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={() => {
                  setSetUp(false);
                }}
              >
                ×
              </span>
            </div>
            <div class="w-4/5 mx-auto my-auto mt-10 h-full space-y-8 text-center">
              <h1 class="text-center text-2xl text-black dark:text-white hover:underline font-medium">
                初期設定
              </h1>
              <div class="mt-12">
                {/*アイコン、ニックネーム、年齢*/}
                <div class="lg:w-1/2 md:w-2/3 w-full m-10 mx-auto">
                  <form>
                    {/* アイコンアップロード */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="icon"
                      >
                        アイコン
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="icon"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          //ファイルをiconにセット
                          const target = e.target as HTMLInputElement;
                          const file = target.files?.[0];
                          if (!file) {
                            return;
                          }
                          setIcon(file);
                        }}
                      />
                    </div>

                    {/* ニックネーム */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="nickname"
                      >
                        ニックネーム
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="nickname"
                        type="text"
                        placeholder="ニックネームを入力"
                        value={nickName}
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          setNickName(target.value);
                        }}
                      />
                    </div>

                    {/* 年齢 */}
                    <div class="mb-6">
                      <label
                        class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2"
                        for="age"
                      >
                        年齢
                      </label>
                      <input
                        class="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        id="age"
                        type="number"
                        placeholder="年齢を入力"
                        onChange={(e) => {
                          const target = e.target as HTMLInputElement;
                          setAge(parseInt(target.value));
                        }}
                      />
                    </div>
                  </form>
                </div>
              </div>

              <div class="flex">
                <button
                  type="submit"
                  class="rounded-lg mx-auto text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                  onClick={async () => {
                    try {
                      //iconをbase64に変換
                      const icondata = icon;
                      if (!icondata) {
                        return;
                      }
                      const iconFile = icondata;
                        const iconBase64 = await convertFileToBase64(iconFile);
                        if (typeof iconBase64 !== "string") {
                          return;
                        }
                        const iconData = iconBase64.split(",")[1];
                        const masterKey = await createMasterKey();
                        const { identityKey, accountKey } =
                          await createIdentityKeyAndAccountKey(masterKey);
                        const deviceKey = await createDeviceKey(masterKey);
                        const encryptedMasterKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(masterKey),
                        );
                        const encryptedIdentityKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(identityKey),
                        );
                        const encryptedAccountKey = await encryptDataDeviceKey(
                          deviceKey,
                          JSON.stringify(accountKey),
                        );
                        const stringifyDeviceKeyPub = JSON.stringify(
                          deviceKey.public,
                        );
                        const db = await createTakosDB();
                        const tx = db.transaction("keys", "readwrite");
                        const store = tx.objectStore("keys");
                        store.put({
                          key: "masterKey",
                          encryptedKey: JSON.stringify(encryptedMasterKey),
                          keyType: "masterKey",
                        });
                        store.put({
                          key: "identityKey",
                          encryptedKey: JSON.stringify(encryptedIdentityKey),
                          keyType: "identityKey",
                        });
                        store.put({
                          key: "accountKey",
                          encryptedKey: JSON.stringify(encryptedAccountKey),
                          keyType: "accountKey",
                        });
                        store.put({
                          key: "deviceKey",
                          encryptedKey: stringifyDeviceKeyPub,
                          keyType: "deviceKey",
                        });
                        console.log(await store.getAll());
                        await tx.done;
                        const res = await fetch("/takos/v2/client/setup", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            nickName: nickName,
                            icon: iconData,
                            age: age,
                            account_key: accountKey,
                            identity_key: identityKey,
                            master_key: masterKey,
                            device_key: deviceKey,
                          }),
                        });
                        const resJson = await res.json();
                        if (resJson.status) {
                          setSetUp(false);
                          alert("設定が完了しました");
                        } else {
                          alert("エラーが発生しました");
                        }
                    } catch (error) {
                      console.log(error);
                      throw error;
                    }
                  }}
                >
                  送信
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      } else {
        reject(new Error("ファイルの変換に失敗しました"));
      }
    };
    reader.onerror = reject;
  });
};
