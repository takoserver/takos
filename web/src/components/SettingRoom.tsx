import { useAtom } from "solid-jotai";
import { openConfig } from "../components/Chat.tsx";
import { isSelectRoomState, selectedRoomState } from "../utils/roomState";
import { createEffect, createSignal, For, Show } from "solid-js";
import { groupChannelState } from "./Chat/SideBar.tsx";
import { PopUpFrame } from "./popUpFrame.tsx";
import { uuidv7 } from "uuidv7";
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
  const [showCreateRole, setShowCreateRole] = createSignal(false);
  const [showEditRole, setShowEditRole] = createSignal<string | null | false>(
    false,
  );
  // 新規ロール作成用のシグナル
  const [roleName, setRoleName] = createSignal("");
  const [roleColor, setRoleColor] = createSignal("#000000");
  const [rolePermissions, setRolePermissions] = createSignal<string[]>([]);
  const [roleId, setRoleId] = createSignal("");
  const availablePermissions = [
    `ADMIN`,
    "MANAGE_CHANNEL",
    `MANAGE_USER`,
    `INVITE_USER`,
    `MANAGE_SERVER`,
    `VIEW_LOG`,
  ];
  const [showAddRole, setShowAddRole] = createSignal(false);
  const [selectedNewRole, setSelectedNewRole] = createSignal<string>("");
  const [pendingMemberRoles, setPendingMemberRoles] = createSignal<string[]>(
    [],
  );
  // editMemberが変更されたとき、一時的な内容を初期化する
  createEffect(() => {
    if (editMember()) {
      const member = groupChannel()?.members.find(
        (m) => m.userId === editMember(),
      );
      if (member) {
        setPendingMemberRoles([...member.role]);
      }
    }
  });
  const [showKickConfirm, setShowKickConfirm] = createSignal(false);
  const [showBanConfirm, setShowBanConfirm] = createSignal(false);
  const [showTimeoutModal, setShowTimeoutModal] = createSignal(false);
  const [timeoutDuration, setTimeoutDuration] = createSignal(0);
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
                          setShowCreateRole(true);
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
                                console.log(role);
                                // role.permissions が undefined の場合は [] ををセット
                                setRolePermissions(role.permissions || []);
                                setShowEditRole(role.id);
                                setRoleName(role.name);
                                setRoleColor(role.color);
                                setRoleId(role.id);
                              }}
                            >
                              編集
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                  {showCreateRole() && (
                    <PopUpFrame
                      // @ts-ignore
                      closeScript={setShowCreateRole}
                    >
                      <div class="p-4">
                        <h3 class="text-lg text-white mb-2">
                          新規ロールの作成
                        </h3>
                        <div class="mb-4">
                          <label class="block text-white mb-1">ロール名</label>
                          <input
                            type="text"
                            value={roleName()}
                            onInput={(e) => setRoleName(e.currentTarget.value)}
                            class="w-full p-2 rounded text-black"
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-white mb-1">色</label>
                          <input
                            type="color"
                            value={roleColor()}
                            onInput={(e) => setRoleColor(e.currentTarget.value)}
                            class="h-10 w-10 rounded cursor-pointer"
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-white mb-1">権限</label>
                          <div>
                            {availablePermissions.map((perm) => (
                              <label class="inline-flex items-center mr-4">
                                <input
                                  type="checkbox"
                                  checked={rolePermissions().includes(perm)}
                                  onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                      setRolePermissions([
                                        ...rolePermissions(),
                                        perm,
                                      ]);
                                    } else {
                                      setRolePermissions(
                                        rolePermissions().filter((p) =>
                                          p !== perm
                                        ),
                                      );
                                    }
                                  }}
                                  class="mr-1"
                                />
                                <span class="text-white">{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button
                            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                              // 作成処理（例：API送信や state 更新処理など）
                              console.log(
                                "Creating role",
                                roleName(),
                                roleColor(),
                                rolePermissions(),
                              );
                              const match = selectedRoom()?.roomid.match(
                                /^g\{([^}]+)\}@(.+)$/,
                              );
                              if (!match) return;
                              const res = await fetch(
                                "/api/v2/group/role/add",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    groupId: match![1] + "@" + match![2],
                                    name: roleName(),
                                    color: roleColor(),
                                    permissions: rolePermissions(),
                                    id: uuidv7(),
                                  }),
                                },
                              );
                              if (res.status !== 200) {
                                alert("エラーが発生しました");
                                return;
                              }
                              const friendUserName = match[1]!;
                              const domainFromRoom = match[2];
                              const baseUrl =
                                `https://${domainFromRoom}/_takos/v1/group`;
                              setTimeout(async () => {
                                const role = await fetch(
                                  `${baseUrl}/role/${
                                    friendUserName + "@" + domainFromRoom
                                  }`,
                                ).then((res) => res.json());
                                setGroupChannel((pre) => {
                                  return {
                                    ...pre!,
                                    roles: role.roles,
                                  };
                                });
                              }, 100);
                              setShowCreateRole(false);
                            }}
                          >
                            作成
                          </button>
                        </div>
                      </div>
                    </PopUpFrame>
                  )}
                  {showEditRole() && (
                    <PopUpFrame
                      // @ts-ignore
                      closeScript={setShowEditRole}
                    >
                      <div class="p-4">
                        <h3 class="text-lg text-white mb-2">
                          ロールの編集
                        </h3>
                        <div class="mb-4">
                          <label class="block text-white mb-1">ロール名</label>
                          <input
                            type="text"
                            value={roleName()}
                            onInput={(e) => setRoleName(e.currentTarget.value)}
                            class="w-full p-2 rounded text-black"
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-white mb-1">色</label>
                          <input
                            type="color"
                            value={roleColor()}
                            onInput={(e) => setRoleColor(e.currentTarget.value)}
                            class="h-10 w-10 rounded cursor-pointer"
                          />
                        </div>
                        <div class="mb-4">
                          <label class="block text-white mb-1">権限</label>
                          <div>
                            {availablePermissions.map((perm) => (
                              <label class="inline-flex items-center mr-4">
                                <input
                                  type="checkbox"
                                  checked={rolePermissions().includes(perm)}
                                  onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                      setRolePermissions([
                                        ...rolePermissions(),
                                        perm,
                                      ]);
                                    } else {
                                      setRolePermissions(
                                        rolePermissions().filter((p) =>
                                          p !== perm
                                        ),
                                      );
                                    }
                                  }}
                                  class="mr-1"
                                />
                                <span class="text-white">{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div class="flex justify-end">
                          <button
                            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                            onClick={async () => {
                              // 作成処理（例：API送信や state 更新処理など）
                              console.log(
                                "Creating role",
                                roleName(),
                                roleColor(),
                                rolePermissions(),
                              );
                              const match = selectedRoom()?.roomid.match(
                                /^g\{([^}]+)\}@(.+)$/,
                              );
                              if (!match) return;
                              const res = fetch("/api/v2/group/role/add", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  groupId: match![1] + "@" + match![2],
                                  name: roleName(),
                                  color: roleColor(),
                                  permissions: rolePermissions(),
                                  id: roleId(),
                                }),
                              });
                              const friendUserName = match[1];
                              const domainFromRoom = match[2];
                              const baseUrl =
                                `https://${domainFromRoom}/_takos/v1/group`;
                              setTimeout(async () => {
                                const role = await fetch(
                                  `${baseUrl}/role/${
                                    friendUserName + "@" + domainFromRoom
                                  }`,
                                ).then((res) => res.json());
                                setGroupChannel((pre) => {
                                  return {
                                    ...pre!,
                                    roles: role.roles,
                                  };
                                });
                              }, 100);
                              setShowCreateRole(false);
                            }}
                          >
                            作成
                          </button>
                        </div>
                      </div>
                    </PopUpFrame>
                  )}
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
                    <>
                      <PopUpFrame
                        // @ts-ignore
                        closeScript={setEditMember}
                      >
                        <div class="p-4">
                          <h3 class="text-lg text-white mb-2">
                            メンバーの編集
                          </h3>
                          <div class="mb-4">
                            <label class="block text-white mb-1">
                              ユーザー名: {editMember()}
                            </label>
                          </div>
                          <div class="mb-4">
                            <label class="block text-white mb-1">ロール</label>
                            {pendingMemberRoles().map((role) => (
                              <div class="flex items-center justify-between mb-2">
                                <span class="text-white">
                                  {(() => {
                                    const role2 = groupChannel()?.roles.find((
                                      r,
                                    ) => r.id === role);
                                    return role2?.name || "不明なロール";
                                  })()}
                                </span>
                                <button
                                  class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                                  onClick={() => {
                                    const member = groupChannel()?.members.find(
                                      (m) => m.userId === editMember(),
                                    );
                                    if (!member) return;
                                    const updatedRoles = member.role.filter((
                                      r: string,
                                    ) => r !== role);
                                    console.log(
                                      `Removing role ${role} from member ${editMember()}`,
                                      updatedRoles,
                                    );
                                    setPendingMemberRoles((pre) =>
                                      pre.filter((r) => r !== role)
                                    );
                                  }}
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                          </div>
                          <div class="mb-4">
                            <button
                              class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                              onClick={() => {
                                setShowAddRole(true);
                              }}
                            >
                              ロール追加
                            </button>
                          </div>
                          <div class="flex justify-end">
                            <button
                              class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                              onClick={() => {
                                console.log(pendingMemberRoles());
                                const match = selectedRoom()?.roomid.match(
                                  /^g\{([^}]+)\}@(.+)$/,
                                );
                                if (!match) return;
                                const friendUserName = match[1];
                                const domainFromRoom = match[2];
                                const res = fetch("/api/v2/group/user/role", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    userId: editMember(),
                                    groupId: friendUserName + "@" +
                                      domainFromRoom,
                                    roleId: pendingMemberRoles(),
                                  }),
                                }).then((res) => {
                                  if (res.status !== 200) {
                                    alert("エラーが発生しました");
                                    return;
                                  }

                                  const baseUrl =
                                    `https://${domainFromRoom}/_takos/v1/group`;
                                  setTimeout(async () => {
                                    const role = await fetch(
                                      `${baseUrl}/members/${
                                        friendUserName + "@" + domainFromRoom
                                      }`,
                                    ).then((res) => res.json());
                                    setGroupChannel((pre) => {
                                      return {
                                        ...pre!,
                                        members: role.members,
                                      };
                                    });
                                  }, 100);
                                  setShowCreateRole(false);
                                  alert("保存しました");
                                });
                              }}
                            >
                              保存
                            </button>
                          </div>
                          <div class="flex justify-between mt-4">
                            <button
                              class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                              onClick={() => setShowKickConfirm(true)}
                            >
                              キック
                            </button>
                            <button
                              class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                              onClick={() => setShowBanConfirm(true)}
                            >
                              バン
                            </button>
                            <button
                              class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                              onClick={() => setShowTimeoutModal(true)}
                            >
                              タイムアウト
                            </button>
                          </div>
                        </div>
                      </PopUpFrame>
                      {showKickConfirm() && (
                        <PopUpFrame
                          // @ts-ignore
                          closeScript={setShowKickConfirm}
                        >
                          <div class="p-4">
                            <h3 class="text-lg text-white mb-2">キック確認</h3>
                            <p class="text-white mb-4">
                              本当にこのメンバーをキックしますか？
                            </p>
                            <div class="flex justify-end">
                              <button
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                  const match = selectedRoom()?.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) return;

                                  const res = await fetch(
                                    "/api/v2/group/kick",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        userId: editMember(),
                                        groupId: match[1] + "@" + match[2],
                                      }),
                                    },
                                  );
                                }}
                              >
                                キック
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}
                      {showBanConfirm() && (
                        <PopUpFrame
                          // @ts-ignore
                          closeScript={setShowBanConfirm}
                        >
                          <div class="p-4">
                            <h3 class="text-lg text-white mb-2">バン確認</h3>
                            <p class="text-white mb-4">
                              本当にこのメンバーをバンしますか？
                            </p>
                            <div class="flex justify-end">
                              <button
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                                onClick={async () => {
                                  const match = selectedRoom()?.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) return;

                                  const res = await fetch(
                                    "/api/v2/group/ban",
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        userId: editMember(),
                                        groupId: match[1] + "@" + match[2],
                                      }),
                                    },
                                  );
                                }}
                              >
                                バン
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}
                      {showTimeoutModal() && (
                        <PopUpFrame
                          // @ts-ignore
                          closeScript={setShowTimeoutModal}
                        >
                          <div class="p-4">
                            <h3 class="text-lg text-white mb-2">
                              タイムアウト設定
                            </h3>
                            <div class="mb-4">
                              <label class="block text-white mb-1">
                                期間 (分)
                              </label>
                              <input
                                type="number"
                                value={timeoutDuration()}
                                onInput={(e) =>
                                  setTimeoutDuration(
                                    parseInt(e.currentTarget.value),
                                  )}
                                class="w-full p-2 rounded text-black"
                              />
                            </div>
                            <div class="flex justify-end">
                              <button
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                                onClick={() => {
                                  // タイムアウト処理
                                  console.log(
                                    `Timeout member ${editMember()} for ${timeoutDuration()} minutes`,
                                  );
                                  setShowTimeoutModal(false);
                                }}
                              >
                                設定
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
    </>
  );
}
