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
  const [friendList, setFriendList] = createSignal<string[]>([]);
  const [groupChannel, setGroupChannel] = useAtom(groupChannelState);
  const [editMember, setEditMember] = createSignal<string | null | false>(null);
  const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = createSignal(false);
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
  const [joinRequests, setJoinRequests] = createSignal<string[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = createSignal(true);
  const [bannedUsers, setBannedUsers] = createSignal<string[]>([]);
  const [isLoadingBanList, setIsLoadingBanList] = createSignal(true);

  // selected()が"request"に設定された時にリクエスト一覧を取得するeffect
  createEffect(() => {
    if (selected() === "request") {
      const fetchJoinRequests = async () => {
        setIsLoadingRequests(true);
        const match = selectedRoom()?.roomid.match(/^g\{([^}]+)\}@(.+)$/);
        if (!match) {
          setIsLoadingRequests(false);
          return;
        }
        try {
          const res = await fetch(
            `https://${match[2]}/_takos/v1/group/requests/${
              match[1] + "@" + match[2]
            }`,
          );
          if (res.ok) {
            const data = await res.json();
            setJoinRequests(data.requests || []);
          }
        } catch (error) {
          console.error("参加リクエストの取得に失敗しました", error);
        } finally {
          setIsLoadingRequests(false);
        }
      };

      fetchJoinRequests();
    }
  });
  createEffect(() => {
    if (selected() === "ban") {
      const fetchBannedUsers = async () => {
        setIsLoadingBanList(true);
        const match = selectedRoom()?.roomid.match(/^g\{([^}]+)\}@(.+)$/);
        if (!match) {
          setIsLoadingBanList(false);
          return;
        }

        try {
          const res = await fetch(
            `https://${match[2]}/_takos/v1/group/bans/${match[1]}@${match[2]}`,
          );

          if (res.ok) {
            const data = await res.json();
            setBannedUsers(data.bans || []);
          }
        } catch (error) {
          console.error("BANリストの取得に失敗しました", error);
        } finally {
          setIsLoadingBanList(false);
        }
      };

      fetchBannedUsers();
    }
  });
  // 既存のcreateSignalの近くに追加
const [groupName, setGroupName] = createSignal("");
const [groupDescription, setGroupDescription] = createSignal("");
const [groupIcon, setGroupIcon] = createSignal("");
const [groupIsPrivate, setGroupIsPrivate] = createSignal(false);
const [updatedGroupName, setUpdatedGroupName] = createSignal("");
const [updatedGroupDescription, setUpdatedGroupDescription] = createSignal("");
const [updatedGroupIcon, setUpdatedGroupIcon] = createSignal("");
const [updatedGroupIsPrivate, setUpdatedGroupIsPrivate] = createSignal(false);
// 他のcreateEffectと同じ場所に追加
createEffect(async () => {
  if (selected() === "detail") {
    const roomid = selectedRoom()?.roomid;
    if (!roomid) {
      return;
    }
    const match = roomid.match(/^g\{([^}]+)\}@(.+)$/);
    if (!match) {
      return;
    }
    const friendUserName = match[1];
    const domainFromRoom = match[2];
    const icon = (await (await fetch(
      `https://${domainFromRoom}/_takos/v1/group/icon/${
        friendUserName + "@" + domainFromRoom
      }`,
    )).json()).icon;
    setGroupIcon(icon);
    const nickName = (await (await fetch(
      `https://${domainFromRoom}/_takos/v1/group/name/${
        friendUserName + "@" + domainFromRoom
      }`,
    )).json()).name;
    const description = (await (await fetch(
      `https://${domainFromRoom}/_takos/v1/group/description/${
        friendUserName + "@" + domainFromRoom
      }`,
    )).json()).description;
    const allowJoin = (await (await fetch(
      `https://${domainFromRoom}/_takos/v1/group/allowJoin/${
        friendUserName + "@" + domainFromRoom
      }`,
    )).json()).allowJoin;
    console.log(allowJoin);
    setGroupName(nickName);
    setGroupDescription(description);
    setGroupIsPrivate(allowJoin);
    setUpdatedGroupName(nickName);
    setUpdatedGroupDescription(description);
    setUpdatedGroupIcon(icon);
    setUpdatedGroupIsPrivate(allowJoin);
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
            <div class="bg-[#242424] rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
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
              <div class="overflow-y-auto custom-scrollbar flex-1">
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

                  {/* 追加のオプションセクション - 縦に並べたメニュー */}
                  <div class="px-4 pb-4 space-y-2">
                    {/* ロールボタン */}
                    <div
                      class="flex items-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelected("role")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span class="text-white">ロール</span>
                    </div>

                    {/* 参加リクエストボタン */}
                    <div
                      class="flex items-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelected("request")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                      <span class="text-white">参加リクエスト</span>
                    </div>
                    <div
                      class="flex items-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelected("ban")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <span class="text-white">BANリスト</span>
                    </div>
                    <div
                      class="flex items-center p-2 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelected("detail")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span class="text-white">詳細設定</span>
                    </div>
                  </div>
                </>
              )}
              {selected() === "detail" && (
                <>
                  <div class="flex flex-col w-full p-4">
                    {/* 戻るボタン */}
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* ヘッダー */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">詳細設定</h3>
                    </div>

                    {/* 説明テキスト */}
                    <p class="text-gray-400 text-sm mb-4">
                      グループの基本情報や参加条件などの設定を変更できます。
                    </p>

                    {/* 設定フォーム */}
                    <div class="space-y-6">
                      {/* グループアイコン設定 */}
                      <div class="bg-gray-800 p-4 rounded-lg">
                        <label class="block text-white font-medium mb-2">グループアイコン</label>
                        <div class="flex items-center space-x-4">
                        <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                          <img 
                            src={"data:image/png;base64," + updatedGroupIcon()} 
                            alt="グループアイコン" 
                            class="w-full h-full object-cover" 
                          />
                        </div>
                          <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors flex items-center"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) {
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                  const base64 = e.target?.result as string;
                                  setUpdatedGroupIcon(base64.split(",")[1]);
                                };
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-5 w-5 mr-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fill-rule="evenodd"
                                d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                                clip-rule="evenodd"
                              />
                            </svg>
                            アップロード
                          </button>
                        </div>
                      </div>

                      {/* グループ名設定 */}
                      <div class="bg-gray-800 p-4 rounded-lg">
                        <label class="block text-white font-medium mb-2">グループ名</label>
                        <input
                          type="text"
                          value={updatedGroupName()}
                          onInput={(e) => setUpdatedGroupName(e.currentTarget.value)}
                          class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
                          placeholder="グループ名を入力"
                        />
                      </div>

                      {/* グループ説明設定 */}
                      <div class="bg-gray-800 p-4 rounded-lg">
                        <label class="block text-white font-medium mb-2">グループ説明</label>
                        <textarea
                          class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none min-h-[80px]"
                          placeholder="グループの説明を入力（任意）"
                          value={updatedGroupDescription()}
                          onInput={(e) => setUpdatedGroupDescription(e.currentTarget.value)}
                        ></textarea>
                      </div>

                      {/* 参加条件設定 */}
                      <div class="bg-gray-800 p-4 rounded-lg">
                      <label class="block text-white font-medium mb-2">参加条件</label>
                        <div class="space-y-2">
                          <label class="flex items-center cursor-pointer">
                            <input 
                              type="radio" 
                              name="joinType" 
                              class="mr-2" 
                              checked={!updatedGroupIsPrivate()} 
                              onChange={() => setUpdatedGroupIsPrivate(false)} 
                            />
                            <span>申請制（管理者の承認が必要）</span>
                          </label>
                          <label class="flex items-center cursor-pointer">
                            <input 
                              type="radio" 
                              name="joinType" 
                              class="mr-2" 
                              checked={updatedGroupIsPrivate()} 
                              onChange={() => setUpdatedGroupIsPrivate(true)} 
                            />
                            <span>自由参加（誰でも参加可能）</span>
                          </label>
                        </div>
                      </div>

                      {/* 保存ボタン */}
                      <div class="flex justify-end">
                      <button
                        class="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md transition-colors"
                        onClick={async () => {
                          // 実際の保存処理はここに実装します
                          const match = selectedRoom()?.roomid.match(/^g\{([^}]+)\}@(.+)$/);
                          if (!match) {
                            return;
                          }
                          const friendUserName = match[1];
                          const domainFromRoom = match[2];
                          
                          // 変更されたもののみを含む更新データを作成
                          interface GroupUpdateData {
                            groupId: string;
                            name?: string;
                            description?: string;
                            allowJoin?: boolean;
                            icon?: string;
                          }
                          
                          // updateDataの定義を修正
                          const updateData: GroupUpdateData = {
                            groupId: friendUserName + "@" + domainFromRoom
                          };
                          
                          // 各項目が変更されている場合のみ追加
                          if (groupName() !== updatedGroupName()) {
                            updateData.name = updatedGroupName();
                          }
                          
                          if (groupDescription() !== updatedGroupDescription()) {
                            updateData.description = updatedGroupDescription();
                          }
                          
                          if (groupIsPrivate() !== updatedGroupIsPrivate()) {
                            updateData.allowJoin = updatedGroupIsPrivate();
                          }
                          
                          if (groupIcon() !== updatedGroupIcon()) {
                            updateData.icon = updatedGroupIcon();
                          }
                          
                          // 変更がない場合は処理を終了
                          if (Object.keys(updateData).length <= 1) {
                            alert("変更はありません");
                            return;
                          }
                          
                          // 更新データを送信
                          const res = await fetch(
                            "./api/v2/group/settings",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(updateData),
                            },
                          );
                          
                          if (res.ok) {
                            // 保存成功時に現在の値を更新
                            setGroupName(updatedGroupName());
                            setGroupDescription(updatedGroupDescription());
                            setGroupIsPrivate(updatedGroupIsPrivate());
                            setGroupIcon(updatedGroupIcon());
                            alert("設定を保存しました");
                          } else {
                            alert("設定の保存に失敗しました");
                          }
                        }}
                      >
                        変更を保存
                      </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selected() === "invite" && (
                <>
                  {/*戻るボタン*/}
                  <div class="flex flex-col w-full p-4">
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* タイトル */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">友達を招待</h3>
                      <span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm">
                        {friendList().length} 人
                      </span>
                    </div>

                    {/* 検索バー */}
                    <div class="mb-5">
                      <div class="relative">
                        <input
                          type="text"
                          class="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="招待するユーザー名を入力してください"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* 招待リスト */}
                    <div class="mt-3 w-full max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      <For each={friendList()}>
                        {(friend) => (
                          <div class="bg-gray-800 rounded-lg mb-3 overflow-hidden hover:bg-gray-750 transition-colors">
                            <div class="p-3 flex justify-between items-center">
                              <div class="flex items-center space-x-3">
                                {/* ユーザーアバター */}
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {friend.charAt(0).toUpperCase()}
                                </div>

                                {/* ユーザー名 */}
                                <span class="text-white font-medium break-all">
                                  {friend}
                                </span>
                              </div>

                              <button
                                class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
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
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                </svg>
                                <span>招待</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </For>

                      {/* 友達が見つからない場合 */}
                      <Show when={friendList().length === 0}>
                        <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-12 w-12 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <p>招待可能なユーザーが見つかりません</p>
                        </div>
                      </Show>
                    </div>
                  </div>
                </>
              )}
              {selected() === "leave" && (
                <>
                  {/*戻るボタン*/}
                  <div class="flex flex-col w-full p-4">
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* タイトル */}
                    <div class="mb-6">
                      <h3 class="text-xl font-bold text-white">
                        グループから退出
                      </h3>
                    </div>

                    {/* 警告メッセージ */}
                    <div class="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-6">
                      <div class="flex items-start">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-6 w-6 text-red-500 mr-3 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <div>
                          <h4 class="text-lg font-medium text-red-400 mb-1">
                            注意
                          </h4>
                          <p class="text-white">
                            グループから退出すると、このグループのメッセージにアクセスできなくなります。この操作は取り消せません。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 確認メッセージと操作ボタン */}
                    <div class="text-center mb-6">
                      <p class="text-white text-lg font-medium mb-6">
                        本当にこのグループから退出しますか？
                      </p>

                      <div class="flex justify-center space-x-4">
                        <button
                          class="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors"
                          onClick={() => setSelected(false)}
                        >
                          キャンセル
                        </button>

                        <button
                          class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors flex items-center"
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 mr-2"
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
                          退出する
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selected() === "role" && (
                <>
                  <div class="flex flex-col w-full p-4">
                    {/* 戻るボタン - 改善されたデザイン */}
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* ヘッダーとロール追加ボタン */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">ロール管理</h3>
                      <button
                        class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded flex items-center transition-colors"
                        onClick={() => {
                          setShowCreateRole(true);
                          // 新規作成時は初期値をリセット
                          setRoleName("");
                          setRoleColor("#6366f1"); // インディゴ色をデフォルトに
                          setRolePermissions([]);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        新規ロール
                      </button>
                    </div>

                    {/* ロール説明 */}
                    <p class="text-gray-400 text-sm mb-4">
                      ロールを使用してメンバーに権限を付与したり、グループを整理したりできます。
                    </p>

                    {/* ロールリスト - 改善されたデザイン */}
                    <div class="mt-2 w-full max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      <For each={groupChannel()!.roles}>
                        {(role) => (
                          <div class="bg-gray-800 rounded-lg mb-3 overflow-hidden hover:bg-gray-750 transition-colors">
                            <div class="p-3 flex justify-between items-center">
                              {/* ロール情報 */}
                              <div class="flex items-center space-x-3 flex-1 min-w-0">
                                {/* カラーインジケーター */}
                                <div
                                  class="w-6 h-6 flex-shrink-0 rounded-md border border-gray-600 mr-2 shadow-sm"
                                  style={{
                                    "background-color": role.color || "#6366f1",
                                    "box-shadow": `0 0 5px ${
                                      role.color || "#6366f1"
                                    }40`,
                                  }}
                                  title={role.name}
                                >
                                </div>

                                {/* ロール名と権限 */}
                                <div class="flex-1 min-w-0">
                                  <div class="text-white font-medium mb-1 break-all">
                                    {role.name}
                                  </div>
                                  <div class="text-xs text-gray-400 truncate">
                                    {role.permissions &&
                                        role.permissions.length > 0
                                      ? role.permissions.join(", ")
                                      : "権限なし"}
                                  </div>
                                </div>
                              </div>

                              {/* アクションボタン */}
                              <div class="flex space-x-2">
                                <button
                                  class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded flex items-center transition-colors"
                                  onClick={() => {
                                    console.log(role);
                                    setRolePermissions(role.permissions || []);
                                    setShowEditRole(role.id);
                                    setRoleName(role.name);
                                    setRoleColor(role.color);
                                    setRoleId(role.id);
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 mr-1"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                  編集
                                </button>

                                {/* 削除ボタン - 新規追加 */}
                                <button
                                  class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center transition-colors"
                                  onClick={() => {
                                    setRoleId(role.id);
                                    setRoleName(role.name);
                                    setShowDeleteRoleConfirm(true);
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-4 w-4 mr-1"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fill-rule="evenodd"
                                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                      clip-rule="evenodd"
                                    />
                                  </svg>
                                  削除
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </For>

                      {/* ロールがない場合の表示 */}
                      {groupChannel()!.roles.length === 0 && (
                        <div class="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-800 rounded-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-12 w-12 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          <p>
                            ロールがありません。新しいロールを作成しましょう
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ロール作成ポップアップ - デザイン改善 */}
                  {showCreateRole() && (
                    <PopUpFrame
                      // @ts-ignore
                      closeScript={setShowCreateRole}
                    >
                      <div class="p-5">
                        <h3 class="text-xl font-bold text-white mb-4">
                          新規ロールの作成
                        </h3>
                        <div class="space-y-4">
                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              ロール名
                            </label>
                            <input
                              type="text"
                              value={roleName()}
                              onInput={(e) =>
                                setRoleName(e.currentTarget.value)}
                              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                              placeholder="ロール名を入力"
                            />
                          </div>

                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              色
                            </label>
                            <div class="flex items-center space-x-3">
                              <input
                                type="color"
                                value={roleColor()}
                                onInput={(e) =>
                                  setRoleColor(e.currentTarget.value)}
                                class="h-10 w-10 rounded cursor-pointer"
                              />
                              <span class="text-white">{roleColor()}</span>
                            </div>
                          </div>

                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              権限
                            </label>
                            <div class="bg-gray-800 p-3 rounded-md max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                              {availablePermissions.map((perm) => (
                                <label class="inline-flex items-center p-2 hover:bg-gray-700 rounded">
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
                                    class="mr-2"
                                  />
                                  <span class="text-white text-sm">{perm}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div class="flex justify-end mt-6 space-x-3">
                          <button
                            class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                            onClick={() => setShowCreateRole(false)}
                          >
                            キャンセル
                          </button>
                          <button
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                            onClick={async () => {
                              if (!roleName().trim()) {
                                alert("ロール名を入力してください");
                                return;
                              }

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

                  {/* ロール編集ポップアップ - デザイン改善 */}
                  {showEditRole() && (
                    <PopUpFrame
                      // @ts-ignore
                      closeScript={setShowEditRole}
                    >
                      <div class="p-5">
                        <h3 class="text-xl font-bold text-white mb-4">
                          ロールの編集
                        </h3>
                        <div class="space-y-4">
                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              ロール名
                            </label>
                            <input
                              type="text"
                              value={roleName()}
                              onInput={(e) =>
                                setRoleName(e.currentTarget.value)}
                              class="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                              placeholder="ロール名を入力"
                            />
                          </div>

                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              色
                            </label>
                            <div class="flex items-center space-x-3">
                              <input
                                type="color"
                                value={roleColor()}
                                onInput={(e) =>
                                  setRoleColor(e.currentTarget.value)}
                                class="h-10 w-10 rounded cursor-pointer"
                              />
                              <span class="text-white">{roleColor()}</span>
                            </div>
                          </div>

                          <div>
                            <label class="block text-white text-sm font-medium mb-2">
                              権限
                            </label>
                            <div class="bg-gray-800 p-3 rounded-md max-h-40 overflow-y-auto grid grid-cols-2 gap-2">
                              {availablePermissions.map((perm) => (
                                <label class="inline-flex items-center p-2 hover:bg-gray-700 rounded">
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
                                    class="mr-2"
                                  />
                                  <span class="text-white text-sm">{perm}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div class="flex justify-end mt-6 space-x-3">
                          <button
                            class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                            onClick={() => setShowEditRole(false)}
                          >
                            キャンセル
                          </button>
                          <button
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                            onClick={async () => {
                              if (!roleName().trim()) {
                                alert("ロール名を入力してください");
                                return;
                              }

                              const match = selectedRoom()?.roomid.match(
                                /^g\{([^}]+)\}@(.+)$/,
                              );
                              if (!match) return;
                              console.log({
                                groupId: match![1] + "@" + match![2],
                                name: roleName(),
                                color: roleColor(),
                                permissions: rolePermissions(),
                                id: roleId(),
                              });
                              await fetch("/api/v2/group/role/add", {
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
                              setShowEditRole(false);
                            }}
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    </PopUpFrame>
                  )}

                  {/* ロール削除確認ポップアップ - 新規追加 */}
                  {showDeleteRoleConfirm() && (
                    <PopUpFrame
                      // @ts-ignore
                      closeScript={setShowDeleteRoleConfirm}
                    >
                      <div class="p-5">
                        <h3 class="text-xl font-bold text-white mb-2">
                          ロールの削除
                        </h3>
                        <div class="mb-5">
                          <div class="flex items-start">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-6 w-6 text-red-500 mr-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            <p class="text-white">
                              <span class="font-medium">"{roleName()}"</span>
                              {" "}
                              ロールを削除しますか？この操作は元に戻せません。
                            </p>
                          </div>
                          <div class="mt-3 text-gray-400 text-sm">
                            このロールを持つメンバーからは、このロールによって付与された権限が削除されます。
                          </div>
                        </div>

                        <div class="flex justify-end space-x-3">
                          <button
                            class="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded transition-colors"
                            onClick={() => setShowDeleteRoleConfirm(false)}
                          >
                            キャンセル
                          </button>
                          <button
                            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                            onClick={async () => {
                              const match = selectedRoom()?.roomid.match(
                                /^g\{([^}]+)\}@(.+)$/,
                              );
                              if (!match) return;

                              try {
                                const res = await fetch(
                                  "/api/v2/group/role/delete",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      groupId: match[1] + "@" + match[2],
                                      roleId: roleId(),
                                    }),
                                  },
                                );

                                if (res.status !== 200) {
                                  alert("ロールの削除中にエラーが発生しました");
                                  return;
                                }

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

                                  setGroupChannel((pre) => ({
                                    ...pre!,
                                    roles: role.roles,
                                  }));
                                }, 100);

                                setShowDeleteRoleConfirm(false);
                              } catch (err) {
                                console.error(
                                  "ロール削除中にエラーが発生しました",
                                  err,
                                );
                                alert("ロール削除中にエラーが発生しました");
                              }
                            }}
                          >
                            削除する
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
                  <div class="flex flex-col w-full p-4">
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* メンバー管理ヘッダー */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">メンバー管理</h3>
                      <span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-sm">
                        {groupChannel()?.members.length || 0} 人
                      </span>
                    </div>

                    {/* 検索バー（オプション） */}
                    <div class="mb-4">
                      <div class="relative">
                        <input
                          type="text"
                          placeholder="メンバーを検索..."
                          class="w-full bg-gray-700 text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5 absolute left-3 top-2.5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* メンバーリスト */}
                    <div class="mt-4 w-full max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      <For each={groupChannel()!.members}>
                        {(member) => (
                          <div class="bg-gray-800 rounded-lg mb-3 overflow-hidden hover:bg-gray-750 transition-colors">
                            <div class="flex justify-between items-center p-3">
                              <div class="flex items-center space-x-3">
                                {/* ユーザーアバタープレースホルダー */}
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {member.userId.charAt(0).toUpperCase()}
                                </div>

                                {/* ユーザー情報 */}
                                <div class="flex flex-col">
                                  <span class="text-white font-medium break-all">
                                    {member.userId}
                                  </span>
                                  <div class="flex items-center">
                                    {/* ロールバッジ表示（最大2つ） */}
                                    {member.role && member.role.length > 0
                                      ? (
                                        <div class="flex space-x-1">
                                          {member.role.slice(0, 2).map(
                                            (roleId) => {
                                              const role = groupChannel()?.roles
                                                .find((r) => r.id === roleId);
                                              return role
                                                ? (
                                                  <span
                                                    class="text-xs px-1.5 py-0.5 rounded"
                                                    style={{
                                                      "background-color":
                                                        `${role.color}20`,
                                                      "color": role.color,
                                                      "border":
                                                        `1px solid ${role.color}`,
                                                    }}
                                                  >
                                                    {role.name}
                                                  </span>
                                                )
                                                : null;
                                            },
                                          )}
                                          {member.role.length > 2 && (
                                            <span class="text-xs text-gray-400">
                                              +{member.role.length - 2}
                                            </span>
                                          )}
                                        </div>
                                      )
                                      : (
                                        <span class="text-xs text-gray-400">
                                          ロールなし
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </div>

                              {/* アクションボタン */}
                              <button
                                class="bg-gray-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1"
                                onClick={() => {
                                  setEditMember(member.userId);
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                <span>編集</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </For>

                      {/* メンバーがいない場合 */}
                      {groupChannel()!.members.length === 0 && (
                        <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-12 w-12 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <p>メンバーがいません</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {editMember() && (
                    <>
                      <PopUpFrame
                        // @ts-ignore
                        closeScript={setEditMember}
                      >
                        <div class="p-4">
                          <h3 class="text-lg font-bold text-white mb-4 border-b border-gray-700 pb-2">
                            メンバーの編集
                          </h3>

                          {/* ユーザー情報セクション */}
                          <div class="mb-6 bg-gray-800 p-3 rounded-lg">
                            <div class="flex items-center mb-2">
                              <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                                <span class="text-lg text-white">
                                  {(editMember() as string).charAt(0)
                                    ?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <label class="block text-white font-medium">
                                  {editMember()}
                                </label>
                                <span class="text-gray-400 text-sm">
                                  {groupChannel()?.members.find((m) =>
                                    m.userId === editMember()
                                  )?.role.length || 0} ロール
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ロールセクション */}
                          <div class="mb-6">
                            <div class="flex items-center justify-between mb-3">
                              <label class="block text-white font-medium">
                                ロール管理
                              </label>
                              <button
                                class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-md flex items-center text-sm transition-colors"
                                onClick={() => setShowAddRole(true)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-4 w-4 mr-1"
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
                                ロール追加
                              </button>
                            </div>

                            {pendingMemberRoles().length > 0
                              ? (
                                <div class="bg-gray-800 p-2 rounded-md max-h-40 overflow-y-auto">
                                  {pendingMemberRoles().map((role) => {
                                    console.log(role);
                                    return (
                                      <div class="flex items-center justify-between mb-2 p-2 hover:bg-gray-700 rounded transition-colors">
                                        <span class="text-white flex-1">
                                          {(() => {
                                            const role2 = groupChannel()?.roles
                                              .find((r) => r.id === role);
                                            return role2?.name ||
                                              "不明なロール";
                                          })()}
                                        </span>
                                        <button
                                          class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm transition-colors"
                                          onClick={() => {
                                            setPendingMemberRoles((pre) =>
                                              pre.filter((r) => r !== role)
                                            );
                                          }}
                                        >
                                          削除
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                              : (
                                <div class="text-gray-400 text-center p-3 bg-gray-800 rounded-md">
                                  このユーザーにはロールが割り当てられていません
                                </div>
                              )}
                          </div>

                          {/* セーブボタン */}
                          <div class="flex justify-end mb-6">
                            <button
                              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                              onClick={() => {
                                const match = selectedRoom()?.roomid.match(
                                  /^g\{([^}]+)\}@(.+)$/,
                                );
                                if (!match) {
                                  return;
                                }
                                const friendUserName = match[1];
                                const domainFromRoom = match[2];

                                fetch("/api/v2/group/user/role", {
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
                                }).then(async (res) => {
                                  if (res.status !== 200) {
                                    alert("エラーが発生しました");
                                    return;
                                  }

                                  const baseUrl =
                                    `https://${domainFromRoom}/_takos/v1/group`;
                                  const role = await fetch(
                                    `${baseUrl}/members/${
                                      friendUserName + "@" + domainFromRoom
                                    }`,
                                  ).then((res) => res.json());

                                  setGroupChannel((pre) => ({
                                    ...pre!,
                                    members: role.members,
                                  }));
                                  alert("ロールを保存しました");
                                });
                              }}
                            >
                              ロールを保存
                            </button>
                          </div>

                          {/* モデレーションアクションセクション */}
                          <div class="border-t border-gray-700 pt-4">
                            <h4 class="text-md text-white mb-3">
                              モデレーションアクション
                            </h4>
                            <div class="grid grid-cols-3 gap-3">
                              <button
                                class="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-md flex flex-col items-center transition-colors"
                                onClick={() => setShowKickConfirm(true)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-5 w-5 mb-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                                キック
                              </button>
                              <button
                                class="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-md flex flex-col items-center transition-colors"
                                onClick={() => setShowBanConfirm(true)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-5 w-5 mb-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L5.636 5.636m12.728 12.728L5.636 18.364"
                                  />
                                </svg>
                                バン
                              </button>
                              <button
                                class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md flex flex-col items-center transition-colors"
                                onClick={() => setShowTimeoutModal(true)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-5 w-5 mb-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                タイムアウト
                              </button>
                            </div>
                          </div>
                        </div>
                      </PopUpFrame>

                      {/* キック確認モーダル */}
                      {showKickConfirm() && (
                        <PopUpFrame closeScript={setShowKickConfirm}>
                          <div class="p-4">
                            <h3 class="text-lg font-bold text-white mb-2">
                              キック確認
                            </h3>
                            <p class="text-white mb-4">
                              ユーザー{" "}
                              <span class="font-medium">{editMember()}</span>
                              {" "}
                              をグループからキックします。
                              このユーザーは再度招待または参加することができます。
                            </p>
                            <div class="flex justify-end gap-2">
                              <button
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={() => setShowKickConfirm(false)}
                              >
                                キャンセル
                              </button>
                              <button
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={async () => {
                                  const match = selectedRoom()?.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) return;

                                  try {
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

                                    if (res.status === 200) {
                                      // 成功の場合、メンバーリストを更新
                                      const friendUserName = match[1];
                                      const domainFromRoom = match[2];
                                      const baseUrl =
                                        `https://${domainFromRoom}/_takos/v1/group`;

                                      const members = await fetch(
                                        `${baseUrl}/members/${
                                          friendUserName + "@" + domainFromRoom
                                        }`,
                                      ).then((res) => res.json());

                                      setGroupChannel((pre) => ({
                                        ...pre!,
                                        members: members.members,
                                      }));
                                      setShowKickConfirm(false);
                                      setEditMember(false);
                                      alert(`${editMember()}をキックしました`);
                                    } else {
                                      alert("キックに失敗しました");
                                    }
                                  } catch (err) {
                                    console.error(
                                      "キック処理中にエラーが発生しました",
                                      err,
                                    );
                                    alert("キック処理中にエラーが発生しました");
                                  }
                                }}
                              >
                                キックする
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}

                      {/* バン確認モーダル */}
                      {showBanConfirm() && (
                        <PopUpFrame closeScript={setShowBanConfirm}>
                          <div class="p-4">
                            <h3 class="text-lg font-bold text-white mb-2">
                              バン確認
                            </h3>
                            <p class="text-white mb-4">
                              ユーザー{" "}
                              <span class="font-medium">{editMember()}</span>
                              {" "}
                              をグループからバンします。
                              このユーザーは二度とグループに参加できなくなります。
                            </p>
                            <div class="flex justify-end gap-2">
                              <button
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={() => setShowBanConfirm(false)}
                              >
                                キャンセル
                              </button>
                              <button
                                class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={async () => {
                                  const match = selectedRoom()?.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) return;

                                  try {
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

                                    if (res.status === 200) {
                                      // 成功の場合、メンバーリストを更新
                                      const friendUserName = match[1];
                                      const domainFromRoom = match[2];
                                      const baseUrl =
                                        `https://${domainFromRoom}/_takos/v1/group`;

                                      const members = await fetch(
                                        `${baseUrl}/members/${
                                          friendUserName + "@" + domainFromRoom
                                        }`,
                                      ).then((res) => res.json());

                                      setGroupChannel((pre) => ({
                                        ...pre!,
                                        members: members.members,
                                      }));
                                      setShowBanConfirm(false);
                                      setEditMember(false);
                                      alert(`${editMember()}をバンしました`);
                                    } else {
                                      alert("バンに失敗しました");
                                    }
                                  } catch (err) {
                                    console.error(
                                      "バン処理中にエラーが発生しました",
                                      err,
                                    );
                                    alert("バン処理中にエラーが発生しました");
                                  }
                                }}
                              >
                                バンする
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}

                      {/* タイムアウトモーダル */}
                      {showTimeoutModal() && (
                        <PopUpFrame closeScript={setShowTimeoutModal}>
                          <div class="p-4">
                            <h3 class="text-lg font-bold text-white mb-2">
                              タイムアウト設定
                            </h3>
                            <p class="text-white mb-4">
                              ユーザー{" "}
                              <span class="font-medium">{editMember()}</span>
                              {" "}
                              を一時的にタイムアウトします。
                              タイムアウト中のユーザーはメッセージを送信できなくなります。
                            </p>
                            <div class="mb-4">
                              <label class="block text-white mb-2">
                                タイムアウト期間
                              </label>
                              <div class="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max="43200" // 30日分の分数
                                  value={timeoutDuration()}
                                  onInput={(e) =>
                                    setTimeoutDuration(
                                      parseInt(e.currentTarget.value) || 0,
                                    )}
                                  class="w-full p-2 rounded text-black"
                                />
                                <span class="text-white whitespace-nowrap">
                                  分
                                </span>
                              </div>
                              <div class="text-gray-400 text-xs mt-1">
                                {timeoutDuration() > 0
                                  ? `約 ${
                                    Math.floor(timeoutDuration() / 60)
                                  } 時間 ${timeoutDuration() % 60} 分`
                                  : ""}
                              </div>
                            </div>
                            <div class="flex justify-end gap-2">
                              <button
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={() => setShowTimeoutModal(false)}
                              >
                                キャンセル
                              </button>
                              <button
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={async () => {
                                  if (timeoutDuration() <= 0) {
                                    alert("タイムアウト期間を入力してください");
                                    return;
                                  }

                                  const match = selectedRoom()?.roomid.match(
                                    /^g\{([^}]+)\}@(.+)$/,
                                  );
                                  if (!match) return;

                                  try {
                                    const res = await fetch(
                                      "/api/v2/group/timeout",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          userId: editMember(),
                                          groupId: match[1] + "@" + match[2],
                                          duration: timeoutDuration(), // 分単位
                                        }),
                                      },
                                    );

                                    if (res.status === 200) {
                                      setShowTimeoutModal(false);
                                      alert(
                                        `${editMember()}を${timeoutDuration()}分間タイムアウトしました`,
                                      );
                                    } else {
                                      alert("タイムアウト設定に失敗しました");
                                    }
                                  } catch (err) {
                                    console.error(
                                      "タイムアウト処理中にエラーが発生しました",
                                      err,
                                    );
                                    alert(
                                      "タイムアウト処理中にエラーが発生しました",
                                    );
                                  }
                                }}
                              >
                                タイムアウト設定
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}

                      {/* ロール追加モーダル */}
                      {showAddRole() && (
                        <PopUpFrame closeScript={setShowAddRole}>
                          <div class="p-4">
                            <h3 class="text-lg font-bold text-white mb-3">
                              ロールを追加
                            </h3>
                            <div class="mb-4">
                              <label class="block text-white mb-2">
                                追加するロールを選択
                              </label>
                              <select
                                class="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
                                value={selectedNewRole()}
                                onChange={(e) =>
                                  setSelectedNewRole(e.currentTarget.value)}
                              >
                                <option value="" disabled>
                                  ロールを選択してください
                                </option>
                                {groupChannel()?.roles
                                  .filter((role) =>
                                    !pendingMemberRoles().includes(role.id)
                                  )
                                  .filter((role) =>
                                    role.id !== "everyone"
                                  )
                                  .map((role) => (
                                    <option value={role.id}>{role.name}</option>
                                  ))}
                              </select>
                            </div>
                            <div class="flex justify-end gap-2">
                              <button
                                class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={() => setShowAddRole(false)}
                              >
                                キャンセル
                              </button>
                              <button
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                                onClick={() => {
                                  if (!selectedNewRole()) {
                                    alert("ロールを選択してください");
                                    return;
                                  }
                                  setPendingMemberRoles([
                                    ...pendingMemberRoles(),
                                    selectedNewRole(),
                                  ]);
                                  setSelectedNewRole("");
                                  setShowAddRole(false);
                                }}
                                disabled={!selectedNewRole()}
                              >
                                追加
                              </button>
                            </div>
                          </div>
                        </PopUpFrame>
                      )}
                    </>
                  )}
                </>
              )}
              {selected() === "ban" && (
                <>
                  <div class="flex flex-col w-full p-4">
                    {/* 戻るボタン */}
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* ヘッダー */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">BANリスト</h3>
                      <div
                        class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm cursor-pointer"
                        onClick={async () => {
                          // BANリストを再読み込み
                          const match = selectedRoom()!.roomid.match(
                            /^g\{([^}]+)\}@(.+)$/,
                          );
                          if (!match) return;

                          setBannedUsers([]);
                          setIsLoadingBanList(true);

                          try {
                            const res = await fetch(
                              `https://${match[2]}/_takos/v1/group/bans/${
                                match[1]
                              }@${match[2]}`,
                            );

                            if (res.ok) {
                              const data = await res.json();
                              setBannedUsers(data.bans || []);
                            }
                          } catch (error) {
                            console.error(
                              "BANリストの取得に失敗しました",
                              error,
                            );
                          } finally {
                            setIsLoadingBanList(false);
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4 inline-block"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span class="ml-1">更新</span>
                      </div>
                    </div>

                    {/* 説明テキスト */}
                    <p class="text-gray-400 text-sm mb-4">
                      グループからBANされたユーザーの一覧です。BANを解除して再度参加を許可できます。
                    </p>

                    {/* BANリスト */}
                    <div class="mt-2 w-full max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {isLoadingBanList()
                        ? (
                          <div class="flex justify-center items-center py-10">
                            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500">
                            </div>
                          </div>
                        )
                        : bannedUsers().length > 0
                        ? (
                          <For each={bannedUsers()}>
                            {(userId) => (
                              <div class="bg-gray-800 rounded-lg mb-3 overflow-hidden hover:bg-gray-750 transition-colors">
                                <div class="p-3 flex justify-between items-center">
                                  <div class="flex items-center space-x-3">
                                    {/* ユーザーアバター */}
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-bold">
                                      {userId.charAt(0).toUpperCase()}
                                    </div>

                                    {/* ユーザー情報 */}
                                    <div class="flex flex-col">
                                      <span class="text-white font-medium break-all">
                                        {userId}
                                      </span>
                                      <span class="text-xs text-red-400">
                                        BANされたユーザー
                                      </span>
                                    </div>
                                  </div>

                                  {/* アクションボタン */}
                                  <button
                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded flex items-center transition-colors"
                                    onClick={async () => {
                                      const match = selectedRoom()!.roomid
                                        .match(/^g\{([^}]+)\}@(.+)$/);
                                      if (!match) {
                                        return;
                                      }

                                      if (
                                        confirm(
                                          `${userId}のBANを解除してよろしいですか？`,
                                        )
                                      ) {
                                        try {
                                          const res = await fetch(
                                            "/api/v2/group/unban",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                groupId: match[1] + "@" +
                                                  match[2],
                                                userId: userId,
                                              }),
                                            },
                                          );

                                          if (res.ok) {
                                            // リストから削除
                                            setBannedUsers((prev) =>
                                              prev.filter((id) => id !== userId)
                                            );
                                            alert(
                                              `${userId}のBANを解除しました`,
                                            );
                                          } else {
                                            alert("BANの解除に失敗しました");
                                          }
                                        } catch (error) {
                                          console.error(
                                            "BAN解除中にエラーが発生しました",
                                            error,
                                          );
                                          alert(
                                            "BAN解除中にエラーが発生しました",
                                          );
                                        }
                                      }
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      class="h-4 w-4 mr-1"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                      />
                                    </svg>
                                    BAN解除
                                  </button>
                                </div>
                              </div>
                            )}
                          </For>
                        )
                        : (
                          <div class="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-800 rounded-lg">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-12 w-12 mb-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            <p>現在、BANされているユーザーはいません</p>
                          </div>
                        )}
                    </div>
                  </div>
                </>
              )}
              {selected() === "request" && (
                <>
                  <div class="flex flex-col w-full p-4">
                    {/* 戻るボタン - 変更なし */}
                    <div
                      class="flex items-center cursor-pointer mb-6 text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setSelected(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="font-medium">戻る</span>
                    </div>

                    {/* ヘッダー */}
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-bold text-white">
                        参加リクエスト
                      </h3>
                      <div
                        class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm cursor-pointer"
                        onClick={async () => {
                          // リクエスト一覧を再読み込み
                          const match = selectedRoom()!.roomid.match(
                            /^g\{([^}]+)\}@(.+)$/,
                          );
                          if (!match) return;

                          setJoinRequests([]);
                          setIsLoadingRequests(true);

                          try {
                            const res = await fetch(
                              `https://${match[2]}/_takos/v1/group/requests/${
                                match[1] + "@" + match[2]
                              }`,
                            );

                            if (res.ok) {
                              const data = await res.json();
                              setJoinRequests(data.requests || []);
                            }
                          } catch (error) {
                            console.error(
                              "参加リクエストの取得に失敗しました",
                              error,
                            );
                          } finally {
                            setIsLoadingRequests(false);
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-4 w-4 inline-block"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span class="ml-1">更新</span>
                      </div>
                    </div>

                    {/* 説明テキスト */}
                    <p class="text-gray-400 text-sm mb-4">
                      グループへの参加をリクエストしているユーザーの一覧です。リクエストを承認または拒否できます。
                    </p>

                    {/* リクエスト一覧 - ユーザーIDのみの配列に対応 */}
                    <div class="mt-2 w-full max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {isLoadingRequests()
                        ? (
                          <div class="flex justify-center items-center py-10">
                            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500">
                            </div>
                          </div>
                        )
                        : joinRequests().length > 0
                        ? (
                          <For each={joinRequests()}>
                            {(userId) => (
                              <div class="bg-gray-800 rounded-lg mb-3 overflow-hidden hover:bg-gray-750 transition-colors">
                                <div class="p-3 flex justify-between items-center">
                                  <div class="flex items-center space-x-3">
                                    {/* ユーザーアバター */}
                                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                      {userId.charAt(0).toUpperCase()}
                                    </div>

                                    {/* ユーザー情報 - 日時情報なし */}
                                    <div class="flex flex-col">
                                      <span class="text-white font-medium break-all">
                                        {userId}
                                      </span>
                                    </div>
                                  </div>

                                  {/* アクションボタン */}
                                  <div class="flex space-x-2">
                                    <button
                                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded flex items-center transition-colors"
                                      onClick={async () => {
                                        const match = selectedRoom()!.roomid
                                          .match(/^g\{([^}]+)\}@(.+)$/);
                                        if (!match) return;

                                        try {
                                          const res = await fetch(
                                            "./api/v2/group/join/accept",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                groupId: match[1] + "@" +
                                                  match[2],
                                                userId: userId,
                                              }),
                                            },
                                          );

                                          if (res.ok) {
                                            // リストから削除
                                            setJoinRequests((prev) =>
                                              prev.filter((id) => id !== userId)
                                            );

                                            // メンバーリストを更新
                                            const friendUserName = match[1];
                                            const domainFromRoom = match[2];
                                            const baseUrl =
                                              `https://${domainFromRoom}/_takos/v1/group`;

                                            const members = await fetch(
                                              `${baseUrl}/members/${
                                                friendUserName + "@" +
                                                domainFromRoom
                                              }`,
                                            ).then((res) => res.json());

                                            setGroupChannel((pre) => ({
                                              ...pre!,
                                              members: members.members,
                                            }));
                                          } else {
                                            alert(
                                              "リクエストの承認に失敗しました",
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            "リクエスト承認中にエラーが発生しました",
                                            error,
                                          );
                                          alert(
                                            "リクエスト承認中にエラーが発生しました",
                                          );
                                        }
                                      }}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="2"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                      承認
                                    </button>

                                    <button
                                      class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded flex items-center transition-colors"
                                      onClick={async () => {
                                        const match = selectedRoom()!.roomid
                                          .match(/^g\{([^}]+)\}@(.+)$/);
                                        if (!match) return;

                                        try {
                                          const res = await fetch(
                                            "/_takos/v1/group/requests/reject",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                groupId: match[1] + "@" +
                                                  match[2],
                                                userId: userId,
                                              }),
                                            },
                                          );

                                          if (res.ok) {
                                            // リストから削除
                                            setJoinRequests((prev) =>
                                              prev.filter((id) => id !== userId)
                                            );
                                          } else {
                                            alert(
                                              "リクエストの拒否に失敗しました",
                                            );
                                          }
                                        } catch (error) {
                                          console.error(
                                            "リクエスト拒否中にエラーが発生しました",
                                            error,
                                          );
                                          alert(
                                            "リクエスト拒否中にエラーが発生しました",
                                          );
                                        }
                                      }}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="h-4 w-4 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="2"
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                      拒否
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </For>
                        )
                        : (
                          <div class="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-800 rounded-lg">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-12 w-12 mb-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                              />
                            </svg>
                            <p>現在、参加リクエストはありません</p>
                          </div>
                        )}
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}
