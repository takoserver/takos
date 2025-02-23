import { useAtom } from "solid-jotai";
import { openConfig } from "../components/Chat.tsx";
import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { createEffect, createSignal, For, Show } from "solid-js";
import { groupChannelState } from "./Chat/SideBar.tsx";
import { PopUpFrame } from "./popUpFrame.tsx";
export function SettingRoom() {
  const [showGroupPopUp, setShowGroupPopUp] = useAtom(openConfig);
  const [isSelectRoom] = useAtom(isSelectRoomState);
  const [selectedRoom] = useAtom(selectedRoomState);
  const [selected, setSelected] = createSignal<false | string>(false);
  const [friendList, setFriendList] = createSignal([]);
  const [groupChannel, setGroupChannel] = useAtom(groupChannelState);
  const [editMember, setEditMember] = createSignal<string | null | false>(null);
  createEffect(() => {
    if (selected() === "invite") {
      async function getFriendList() {
        const res = await (await fetch("/api/v2/friend/list", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })).json();
        setFriendList(res);
      }
      getFriendList();
    }
  });
  return (
    <>
      {showGroupPopUp() && isSelectRoom() && selectedRoom()!.type === "group" &&
        (
          <div
            class="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4 animate-fadeIn z-[9999999999999999999999999]"
            role="dialog"
            aria-modal="true"
          >
            <div class="bg-[#242424] rounded-lg shadow-2xl w-full max-w-md">
              {/* ヘッダー */}
              <div class="flex items-center justify-between border-b border-gray-700 px-5 py-3">
                <h2 class="text-xl font-semibold text-white">グループ設定</h2>
                <button
                  onClick={() => setShowGroupPopUp(false)}
                  aria-label="閉じる"
                  class="text-gray-400 hover:text-white text-2xl transition-colors"
                >
                  &times;
                </button>
              </div>
              {!selected() && (
                <>
                <div class="flex justify-around items-center w-full h-full p-4">
                  {/* メンバーアイコン */}
                  <div
                    class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onClick={() => setSelected("member")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a9 9 0 00-9 9h18a9 9 0 00-9-9z"
                      />
                    </svg>
                    <span class="mt-1 text-sm text-white">メンバー</span>
                  </div>

                  {/* 招待アイコン */}
                  <div
                    class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onClick={() => setSelected("invite")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span class="mt-1 text-sm text-white">招待</span>
                  </div>

                  {/* 退出アイコン */}
                  <div
                    class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
                    onClick={() => setSelected("leave")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                      />
                    </svg>
                    <span class="mt-1 text-sm text-white">退出</span>
                  </div>
                </div>
                <div
                  class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
                  onClick={() => setSelected("role")}
                >
                  <div class="h-10 flex items-center justify-center rounded w-full hover:bg-gray-700">
                    <span class="text-white text-sm">ロール</span>
                  </div>
                </div>
                </>
              )}
              {selected() === "invite" && (
                  <>
                    {/*戻るボタン*/}
                    <div class="flex flex-col w-full">
                      <div
                        class="flex items-center cursor-pointer mb-4"
                        onClick={() => setSelected(false)}
                      >
                        {"戻る"}
                      </div>
                      {/* 検索バー */}
                      <div class="w-full">
                        <input
                          type="text"
                          class="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                          placeholder="招待するユーザー名を入力してください"
                        />
                      </div>
                      {/* 招待リスト */}
                      <div class="mt-4 w-full">
                        <For each={friendList()}>
                          {(friend) => (
                            <div class="p-2 border rounded mb-2 flex justify-between items-center">
                              <span class="text-white">{friend}</span>
                              <button
                                class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                onClick={() => {
                                  const match = selectedRoom()!.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) {
                                    return;
                                  }
                                  const friendUserName = match[1];
                                  const domainFromRoom = match[2];
                                  const res = fetch("/api/v2/group/invite", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      groupId: friendUserName + "@" +
                                        domainFromRoom,
                                      userId: friend,
                                    }),
                                  });
                                }}
                              >
                                招待
                              </button>
                            </div>
                          )}
                        </For>
                        <Show when={friendList().length === 0}>
                          <div class="text-gray-400">
                            招待可能なユーザーが見つかりません
                          </div>
                        </Show>
                      </div>
                    </div>
                  </>
                )}
                {selected() === "leave" && (
                  <>
                    {/*戻るボタン*/}
                    <div class="flex flex-col w-full">
                      <div
                        class="flex items-center cursor-pointer mb-4"
                        onClick={() => setSelected(false)}
                      >
                        {"戻る"}
                      </div>
                      {/* 招待リスト */}
                      <div class="mt-4 w-full flex">
                        <div class="m-auto">
                          ほんとに退出しますか？
                          {/* 退出ボタン */}
                          <button
                            class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                            onClick={() => {
                              const match = selectedRoom()!.roomid.match(
                                /^g\{([^}]+)\}@(.+)$/,
                              );
                              if (!match) {
                                return;
                              }
                              const friendUserName = match[1];
                              const domainFromRoom = match[2];
                              const res = fetch("/api/v2/group/leave", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  groupId: friendUserName + "@" +
                                    domainFromRoom,
                                }),
                              });
                            }}
                          >
                            退出
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                  {selected() === "member" && (
                    <>
                      {/*戻るボタン*/}
                      <div class="flex flex-col w-full">
                        <div
                          class="flex items-center cursor-pointer mb-4"
                          onClick={() => setSelected(false)}
                        >
                          {"戻る"}
                        </div>
                        {/* メンバーリスト */}
                        <div class="mt-4 w-full">
                          <For each={groupChannel()!.members}>
                            {(member) => (
                              <div class="p-2 border rounded mb-2 flex justify-between items-center">
                                <span class="text-white break-all">
                                  {member.userId}
                                </span>
                                <button
                                  class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                  onClick={() => {
                                    setEditMember(member.userId);
                                  }}
                                >
                                  編集
                                </button>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                      {editMember() && (
                        <PopUpFrame
                          // @ts-ignore
                          closeScript={setEditMember}
                        ></PopUpFrame>
                      )}
                    </>
                  )}
                  {selected() === "role" && (
              <>
                <div class="flex flex-col w-full">
                  <div
                    class="flex items-center cursor-pointer mb-4"
                    onClick={() => setSelected(false)}
                  >
                    {"戻る"}
                  </div>
                  {/* 追加ボタン */}
                  <div class="mb-4">
                    <button
                      class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                      onClick={() => {
                        // 追加処理用のコードをここに記述
                      }}
                    >
                      追加
                    </button>
                  </div>
                  {/* ロールリスト */}
                  <div class="mt-4 w-full">
                    <For each={groupChannel()!.roles}>
                      {(role) => (
                        <div class="p-2 border rounded mb-2 flex justify-between items-center">
                          <span class="text-white break-all">
                            {role.name}
                          </span>
                          <button
                            class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                            onClick={() => {
                              // 編集処理用のコードをここに記述
                            }}
                          >
                            編集
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </>
            )}
            </div>
            
          </div>
        )}
    </>
  );
}
