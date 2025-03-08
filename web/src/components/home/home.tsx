import { useAtom, useAtomValue, useSetAtom } from "solid-jotai";
import { UAParser } from "ua-parser-js";
import {
  descriptionState,
  deviceKeyState,
  friendsState,
  iconState,
  nicknameState,
  talkListState,
} from "../../utils/state";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import {
  clearDB,
  createTakosDB,
  decryptShareSignKey,
  encryptAccountKey,
} from "../../utils/storage/idb";
import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  encryptDataShareKey,
  generateAccountKey,
  keyHash,
  signDataShareSignKey,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import hash from "fnv1a";
import { fetchingUsersState } from "../sidebar/SideBar";
import { PopUpFrame, PopUpInput, PopUpTitle } from "../utils/popUpFrame";

const userId = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;
const [selected, setSelected] = createSignal<
  | null
  | string
  | "settings:profile"
  | "settings:keys"
  | "settings:account"
  | "friend:detail"
  | "friend:verify"
>(null);

// friendSelected の状態を保存
const [friendDetailId, setFriendDetailId] = createSignal<string | null>(null);

export function Home() {
  const nickName = useAtomValue(nicknameState);
  const icon = useAtomValue(iconState);
  const description = useAtomValue(descriptionState);
  const [talkList] = useAtom(talkListState);
  const [exampleFriendName, setExampleFriendName] = createSignal("");
  const [exampleFriendIcon, setExampleFriendIcon] = createSignal("");
  const [exampleGroupIcon, setExampleGroupIcon] = createSignal("");
  const [exampleGroupName, setExampleGroupName] = createSignal("");
  const [fetchingUsers, setFetchingUsers] = useAtom(fetchingUsersState);

  createEffect(async () => {
    const friends = [];
    const groups = [];
    for (const talk of talkList()!) {
      if (talk.type === "friend") {
        const match = talk.roomid.match(/^m\{([^}]+)\}@(.+)$/);
        if (!match) {
          continue;
        }
        const friendUserName = match[1];
        const domainFromRoom = match[2];
        friends.push(friendUserName + "@" + domainFromRoom);
      } else {
        const match = talk.roomid.match(/^g\{([^}]+)\}@(.+)$/);
        if (!match) {
          continue;
        }
        const groupName = match[1];
        const domainFromRoom = match[2];
        groups.push(groupName + "@" + domainFromRoom);
      }
      // 3つ以上見つかったら終了ではなく、最大3つまで取得するよう変更
      if (friends.length >= 3 && groups.length >= 3) {
        break;
      }
    }

    // 友達がいる場合は表示（3つ以上→1つ以上に変更）
    if (friends.length > 0) {
      // 最大3つまでの友達情報を取得
      const displayFriends = friends.slice(0, 3);

      // 以下は既存の処理をそのまま使用
      // 友達情報を並列取得
      await Promise.all(displayFriends.map(async (friendId) => {
        // すでに取得中または取得済みならそのPromiseを使用
        if (!fetchingUsers().has(friendId)) {
          // 新しく取得処理を開始し、Mapに登録
          const fetchUserInfo = async () => {
            try {
              const host = friendId.split("@")[1];
              // 並行して両方の情報を取得
              const [iconResponse, nickNameResponse] = await Promise.all([
                fetch(`https://${host}/_takos/v1/user/icon/${friendId}`)
                  .then((res) => res.json()),
                fetch(`https://${host}/_takos/v1/user/nickName/${friendId}`)
                  .then((res) => res.json()),
              ]);

              return {
                icon: iconResponse.icon,
                nickName: nickNameResponse.nickName,
                type: "friend" as const,
              };
            } catch (error) {
              console.error(
                `Failed to fetch user info for ${friendId}:`,
                error,
              );
              return {
                icon: "",
                nickName: friendId,
                type: "friend" as const,
              };
            }
          };

          const newMap = new Map(fetchingUsers());
          newMap.set(friendId, fetchUserInfo());
          setFetchingUsers(newMap);
        }
      }));

      // 最初の友達の情報を表示用に設定
      try {
        const friendNames = [];
        // 最大3つの友達の情報を取得
        for (const friendId of displayFriends) {
          const friendInfo = await fetchingUsers().get(friendId);
          if (friendInfo) {
            friendNames.push(friendInfo.nickName);
          }
        }
        // 友達の名前をカンマ区切りで設定
        setExampleFriendName(friendNames.join(", "));
        // 最初の友達のアイコンは変更なし
        if (displayFriends.length > 0) {
          const firstFriendInfo = await fetchingUsers().get(displayFriends[0]);
          if (firstFriendInfo) {
            setExampleFriendIcon(firstFriendInfo.icon);
          }
        }
      } catch (error) {
        console.error("Error fetching friend info:", error);
      }
    }

    if (groups.length > 0) {
      // 3つのグループのnameとiconを取得
      const displayGroups = groups.slice(0, 3);

      // グループ情報を並列取得
      await Promise.all(displayGroups.map(async (groupId) => {
        // すでに取得中または取得済みならそのPromiseを使用
        if (!fetchingUsers().has(groupId)) {
          // 新しく取得処理を開始し、Mapに登録
          const fetchGroupInfo = async () => {
            try {
              const host = groupId.split("@")[1];
              // 並行して両方の情報を取得
              const [iconResponse, nameResponse] = await Promise.all([
                fetch(`https://${host}/_takos/v1/group/icon/${groupId}`)
                  .then((res) => res.json()),
                fetch(`https://${host}/_takos/v1/group/name/${groupId}`)
                  .then((res) => res.json()),
              ]);

              return {
                icon: iconResponse.icon,
                nickName: nameResponse.name,
                type: "group" as const,
              };
            } catch (error) {
              console.error(
                `Failed to fetch group info for ${groupId}:`,
                error,
              );
              return {
                icon: "",
                nickName: groupId,
                type: "group" as const,
              };
            }
          };

          const newMap = new Map(fetchingUsers());
          newMap.set(groupId, fetchGroupInfo());
          setFetchingUsers(newMap);
        }
      }));

      // 最初のグループの情報を表示用に設定
      try {
        const groupNames = [];
        // 最大3つのグループの情報を取得
        for (const groupId of displayGroups) {
          const groupInfo = await fetchingUsers().get(groupId);
          if (groupInfo) {
            groupNames.push(groupInfo.nickName);
          }
        }
        // グループの名前をカンマ区切りで設定
        setExampleGroupName(groupNames.join(", "));
        // 最初のグループのアイコンは変更なし
        if (displayGroups.length > 0) {
          const firstGroupInfo = await fetchingUsers().get(displayGroups[0]);
          if (firstGroupInfo) {
            setExampleGroupIcon(firstGroupInfo.icon);
          }
        }
      } catch (error) {
        console.error("Error fetching group info:", error);
      }
    }
  });
  const [addFriendByIdFormOpen, setAddFriendByIdFormOpen] = createSignal(false);
  const [addFriendByIdFormInput, setAddFriendByIdFormInput] = createSignal("");
  return (
    <>
      {selected() === null && (
        <>
          <div class="flex items-center justify-between p-4">
            <div class="text-xs">
            </div>
            <div class="flex items-center space-x-4">
              <span
                class="text-gray-400 cursor-pointer hover:text-white"
                onClick={() => setSelected("settings")} // ここを変更
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </span>
              <span
                class="text-gray-400 cursor-pointer hover:text-white"
                onClick={() => setSelected("addUser")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  class="w-6 h-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </span>
            </div>
          </div>
          <div class="p-4">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 rounded-full flex items-center justify-center">
                <img
                  src={"data:image/jpg;base64," + icon()}
                  alt="Profile"
                  class="rounded-full"
                />
              </div>
              <div>
                <h1 class="text-2xl font-bold">{nickName()}</h1>
                <p class="text-sm">{description()}</p>
                <p class="text-sm text-green-400">{userId}</p>
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
                <div
                  class="flex items-center space-x-2"
                  onClick={() => {
                    setSelected("friends");
                  }}
                >
                  <img
                    src={exampleFriendIcon()
                      ? "data:image/png;base64," + exampleFriendIcon()
                      : ""}
                    alt=""
                    class="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p class="text-sm">友だち</p>
                    <p class="text-xs text-gray-400">{exampleFriendName()}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <img
                    src={exampleGroupIcon()
                      ? "data:image/png;base64," + exampleGroupIcon()
                      : ""}
                    alt="グループ"
                    class="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p class="text-sm">グループ</p>
                    <p class="text-xs text-gray-400">{exampleGroupName()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {selected() == "friends" && <Friends />}
      {selected() === "addUser" && <AddUserUI />}
      {selected() === "settings" && <Settings />}
      {selected() === "settings:profile" && <ProfileSettings />}
      {selected() === "settings:keys" && <KeyManagement />}
      {selected() === "settings:account" && <AccountManagement />}
      {selected() === "friend:detail" && <FriendDetail />}
      {selected() === "friend:verify" && <FriendVerify />}
    </>
  );
}

function AddUserUI() {
  const [searchId, setSearchId] = createSignal("");
  const [searchResult, setSearchResult] = createSignal<
    {
      userName: string;
      icon: string;
      nickName: string;
      description: string;
    } | null
  >(null);
  const [isSearching, setIsSearching] = createSignal(false);

  const handleInvite = () => {
    // 招待機能の実装をここに追加
    alert("招待リンクがコピーされました");
  };

  const handleQRCode = () => {
    // QRコード表示機能の実装をここに追加
    alert("QRコードを表示します");
  };

  const handleSearch = async () => {
    const id = searchId().trim();
    if (!id) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      // ユーザー検索リクエスト
      const domain = id.split("@")[1];
      const icon = await fetch(`https://${domain}/_takos/v1/user/icon/${id}`);
      const nickName = await fetch(
        `https://${domain}/_takos/v1/user/nickName/${id}`,
      );
      const discription = await fetch(
        `https://${domain}/_takos/v1/user/description/${id}`,
      );
      if (!icon.ok) {
        alert("ユーザーが見つかりませんでした");
        return;
      }
      setSearchResult({
        userName: id,
        icon: (await icon.json()).icon,
        nickName: (await nickName.json()).nickName,
        description: (await discription.json()).description,
      });
    } catch (error) {
      console.error("ユーザー検索エラー:", error);
      alert("検索中にエラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult()) return;

    try {
      const res = await fetch("/api/v2/friend/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: searchResult()!.userName,
        }),
      });

      if (res.status === 200) {
        alert("リクエストを送信しました");
        setSearchId("");
        setSearchResult(null);
      } else {
        alert("リクエスト送信中にエラーが発生しました");
      }
    } catch (error) {
      console.error("友達リクエストエラー:", error);
      alert("エラーが発生しました");
    }
  };

  return (
    <>
      <div class="flex items-center justify-between p-4">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setSelected(null)}
        >
          戻る
        </button>
        <h2 class="font-bold text-xl">友だちを追加</h2>
        <div class="w-10"></div> {/* バランス用の空要素 */}
      </div>

      <div class="p-4 max-w-full overflow-x-hidden">
        {/* 招待とQRコードのボタン */}
        <div class="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleInvite}
            class="bg-[#1E1E1E] hover:bg-[#252525] text-white py-3 px-3 rounded-lg flex flex-col items-center justify-center transition-colors border border-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 mb-1 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span class="font-medium text-sm">招待</span>
          </button>

          <button
            onClick={handleQRCode}
            class="bg-[#1E1E1E] hover:bg-[#252525] text-white py-3 px-3 rounded-lg flex flex-col items-center justify-center transition-colors border border-gray-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 mb-1 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <span class="font-medium text-sm">QRコード</span>
          </button>
        </div>

        {/* IDで検索 - より暗いデザイン */}
        <div class="bg-[#1A1A1A] rounded-lg p-4 border border-[#252525] shadow-lg shadow-black/30">
          <h3 class="text-md font-medium mb-3 text-gray-200">
            IDで友だちを検索
          </h3>

          <div class="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={searchId()}
              onInput={(e) => setSearchId(e.target.value)}
              placeholder="ユーザーID（例: user@example.com）"
              class="w-full p-3 bg-[#0D0D0D] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 border border-[#333] text-sm"
            />
            <button
              onClick={handleSearch}
              class="bg-blue-700 hover:bg-blue-800 p-3 rounded-lg transition-colors flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0"
              disabled={!searchId().trim() || isSearching()}
            >
              <div class="flex items-center justify-center">
                {isSearching()
                  ? (
                    <svg
                      class="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      >
                      </circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      >
                      </path>
                    </svg>
                  )
                  : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <span class="ml-1 sm:hidden block">検索</span>
                    </>
                  )}
              </div>
            </button>
          </div>

          {/* 検索結果表示エリア */}
          {searchResult() && (
            <div class="mt-6 bg-[#121212] rounded-lg p-4 border border-gray-800 animate-fadeIn">
              <div class="flex items-center gap-4">
                <div class="flex-shrink-0">
                  {searchResult()!.icon
                    ? (
                      <img
                        src={`data:image/png;base64,${searchResult()!.icon}`}
                        alt="プロフィール画像"
                        class="w-16 h-16 rounded-full object-cover border border-gray-700"
                      />
                    )
                    : (
                      <div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                </div>

                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-lg text-white truncate">
                    {searchResult()!.nickName}
                  </h4>
                  <p class="text-xs text-blue-400 truncate mb-1">
                    {searchResult()!.userName}
                  </p>
                  <p class="text-sm text-gray-400 line-clamp-2">
                    {searchResult()!.description || "自己紹介はありません"}
                  </p>
                </div>
              </div>

              <div class="mt-4 flex justify-end">
                <button
                  onClick={handleSendRequest}
                  class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  友だちリクエストを送信
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
const [friendSelected, setFriendSelected] = createSignal<null | string>(null);

function FriendManue() {
  // friendSelected シグナルの値に基づいて友だち詳細情報を取得します
  const [friendDetails, setFriendDetails] = createSignal<{
    nickName: string;
    icon: string;
    friendId: string;
  }>({ nickName: "", icon: "", friendId: "" });
  const [selectedMenu, setSelectedMenu] = createSignal<"verify" | null>(null);

  // friendSelected が変更された場合に「friendDetails」を更新
  createEffect(async () => {
    const friendId = friendSelected();
    if (!friendId) return;
    try {
      const host = friendId.split("@")[1];
      const iconResponse = await fetch(
        `https://${host}/_takos/v1/user/icon/${friendId}`,
      );
      const nickNameResponse = await fetch(
        `https://${host}/_takos/v1/user/nickName/${friendId}`,
      );
      const iconData = await iconResponse.json();
      const nickNameData = await nickNameResponse.json();
      setFriendDetails({
        nickName: nickNameData.nickName,
        icon: iconData.icon,
        friendId: friendId,
      });
    } catch (error) {
      console.error("友だち詳細取得エラー:", error);
    }
  });

  // friendSelected が null の場合は何もレンダリングしない
  if (!friendSelected()) return null;

  return (
    <>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div class="bg-gray-900 p-6 rounded-lg w-96 text-white">
          <div class="flex justify-between">
            <h2 class="text-xl font-bold">友だち詳細</h2>
            <button
              class="text-blue-500"
              onClick={() => {
                setFriendSelected(null);
              }}
            >
              閉じる
            </button>
          </div>
          {selectedMenu() === "verify" && (
            <Verify friendId={friendSelected()!} />
          )}
          {selectedMenu() === null && (
            <>
              <div class="flex items-center gap-3 mt-4">
                <img
                  src={"data:image/png;base64," + friendDetails().icon}
                  alt="icon"
                  class="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div class="font-bold text-lg">
                    {friendDetails().nickName}
                  </div>
                  <div class="text-sm text-gray-400">
                    {friendDetails().friendId}
                  </div>
                </div>
              </div>
              <div class="mt-6">
                <button class="w-full p-2 bg-blue-500 rounded-md hover:bg-blue-600 mb-2">
                  チャットを開始
                </button>
                {!encrypted().includes(friendSelected()!) && (
                  <button
                    onClick={() => {
                      setSelectedMenu("verify");
                    }}
                    class="w-full p-2 bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    鍵の検証
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Verify({ friendId }: { friendId: string }) {
  const [keys, setKeys] = createSignal<[string, string]>(["", ""]);
  const deviceKey = useAtomValue(deviceKeyState);
  onMount(async () => {
    const encryptedMasterKey = localStorage.getItem("masterKey");
    const deviceKeyS = deviceKey();
    if (!encryptedMasterKey || !deviceKeyS) return;
    const decryptedMasterKey = await decryptDataDeviceKey(
      deviceKeyS,
      encryptedMasterKey,
    );
    if (!decryptedMasterKey) return;
    const friendMasterKeyRes = await fetch(
      `https://${
        friendId.split("@")[1]
      }/_takos/v1/key/masterKey?userId=${friendId}`,
    );
    const friendMasterKeyData = await friendMasterKeyRes.json();
    const friendMasterKey = friendMasterKeyData.key;
    setKeys([JSON.parse(decryptedMasterKey).publicKey, friendMasterKey]);
  });
  return (
    <div class="space-y-4 p-4">
      <div>
        <p class="mb-2 font-bold">あなたのハッシュ:</p>
        <p class="break-all bg-gray-800 p-2 rounded">{hash(keys()[0])}</p>
      </div>
      <div>
        <p class="mb-2 font-bold">友だちのハッシュ:</p>
        <p class="break-all bg-gray-800 p-2 rounded">{hash(keys()[1])}</p>
      </div>
      <button
        class="w-full p-2 bg-green-500 rounded-md hover:bg-green-600"
        onClick={async () => {
          const db = await createTakosDB();
          const hash = await keyHash(keys()[1]);
          await db.put("allowKeys", {
            userId: friendId,
            latest: true,
            key: hash,
            timestamp: new Date().getTime(),
          });
          alert("鍵の検証が完了しました");
        }}
      >
        承認
      </button>
    </div>
  );
}

const [encrypted, setEncrypted] = createSignal<string[]>([]);
function Friends() {
  const [friends] = useAtom(friendsState);

  createEffect(async () => {
    const db = await createTakosDB();
    const allowKeysData = await db.getAll("allowKeys");
    for (const allowKey of allowKeysData) {
      if (allowKey.latest === true) {
        setEncrypted((prev) => [...prev, allowKey.userId]);
      }
    }
  });
  return (
    <>
      {/* モーダル呼び出しを削除 */}
      <div class="flex items-center justify-between p-4">
        <div>
          <button
            class="text-blue-400 hover:text-blue-300 transition-colors"
            onClick={() => setSelected(null)}
          >
            戻る
          </button>
        </div>
        <h2 class="font-bold text-xl">友だちリスト</h2>
        <div class="w-10"></div> {/* バランス用の空要素 */}
      </div>
      <div class="p-4">
        {friends().map((friend) => <TalkListFriend friendId={friend} />)}
      </div>
    </>
  );
}

function TalkListFriend({
  friendId,
}: {
  friendId: string;
}) {
  const [nickName, setNickName] = createSignal("");
  const [icon, setIcon] = createSignal("");
  const [fetchingUsers, setFetchingUsers] = useAtom(fetchingUsersState);
  createEffect(async () => {
    // すでに取得中または取得済みならそのPromiseを使用
    if (!fetchingUsers().has(friendId)) {
      // 新しく取得処理を開始し、Mapに登録
      const fetchUserInfo = async () => {
        try {
          const host = friendId.split("@")[1];
          // 並行して両方の情報を取得
          const [iconResponse, nickNameResponse] = await Promise.all([
            fetch(`https://${host}/_takos/v1/user/icon/${friendId}`)
              .then((res) => res.json()),
            fetch(`https://${host}/_takos/v1/user/nickName/${friendId}`)
              .then((res) => res.json()),
          ]);

          return {
            icon: iconResponse.icon,
            nickName: nickNameResponse.nickName,
            type: "friend" as const,
          };
        } catch (error) {
          console.error(`Failed to fetch user info for ${friendId}:`, error);
          return {
            icon: "",
            nickName: friendId,
            type: "friend" as const,
          };
        }
      };

      const newMap = new Map(fetchingUsers());
      newMap.set(friendId, fetchUserInfo());
      setFetchingUsers(newMap); // アトムを通じて更新
    }

    try {
      // 取得が完了するのを待つ
      const result = await fetchingUsers().get(friendId);
      if (result) {
        setIcon(result.icon);
        setNickName(result.nickName);
      }
    } catch (error) {
      console.error(`Error waiting for user info: ${friendId}`, error);
    }
  });
  return (
    <div
      class="flex flex-wrap items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
      onClick={() => {
        // モーダルを開く代わりに状態を変更
        setFriendDetailId(friendId);
        setSelected("friend:detail");
      }}
    >
      <img
        src={"data:image/png;base64," + icon()}
        alt="icon"
        class="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-lg truncate">
          {nickName()}
        </div>
        <div class="text-xs text-gray-400 truncate">
          {friendId}
        </div>
      </div>
      {encrypted().includes(friendId) && (
        <span class="text-gray-400 flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 11c-2.21 0-4 1.79-4 4v1h8v-1c0-2.21-1.79-4-4-4z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 11V7a4 4 0 118 0v4"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

function FriendDetail() {
  const [friendDetails, setFriendDetails] = createSignal<{
    nickName: string;
    icon: string;
    friendId: string;
  }>({ nickName: "", icon: "", friendId: "" });

  // 友だち情報を取得
  createEffect(async () => {
    const friendId = friendDetailId();
    if (!friendId) return;

    try {
      const host = friendId.split("@")[1];
      const [iconResponse, nickNameResponse] = await Promise.all([
        fetch(`https://${host}/_takos/v1/user/icon/${friendId}`),
        fetch(`https://${host}/_takos/v1/user/nickName/${friendId}`),
      ]);

      const iconData = await iconResponse.json();
      const nickNameData = await nickNameResponse.json();

      setFriendDetails({
        nickName: nickNameData.nickName,
        icon: iconData.icon,
        friendId: friendId,
      });
    } catch (error) {
      console.error("友だち詳細取得エラー:", error);
    }
  });

  return (
    <>
      <div class="flex items-center justify-between p-4">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setSelected("friends")}
        >
          戻る
        </button>
        <h2 class="font-bold text-xl">友だち詳細</h2>
        <div class="w-10"></div> {/* バランス用の空要素 */}
      </div>

      <div class="p-4">
        <div class="p-4 bg-gray-800/70 border border-gray-700 rounded-lg">
          <div class="flex items-center gap-4">
            <img
              src={`data:image/png;base64,${friendDetails().icon}`}
              alt="icon"
              class="w-20 h-20 rounded-full object-cover border-2 border-gray-700"
            />
            <div>
              <h3 class="text-xl font-bold mb-1">{friendDetails().nickName}</h3>
              <p class="text-sm text-blue-400">{friendDetails().friendId}</p>
            </div>
          </div>

          <div class="mt-6 space-y-3">
            <button class="w-full p-3 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              チャットを開始
            </button>

            {!encrypted().includes(friendDetailId()!) && (
              <button
                onClick={() => setSelected("friend:verify")}
                class="w-full p-3 bg-green-600/80 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                鍵の検証
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// 友だち鍵検証画面コンポーネント
function FriendVerify() {
  const [keys, setKeys] = createSignal<[string, string]>(["", ""]);
  const deviceKey = useAtomValue(deviceKeyState);

  onMount(async () => {
    const friendId = friendDetailId();
    if (!friendId) return;

    const encryptedMasterKey = localStorage.getItem("masterKey");
    const deviceKeyS = deviceKey();
    if (!encryptedMasterKey || !deviceKeyS) return;

    const decryptedMasterKey = await decryptDataDeviceKey(
      deviceKeyS,
      encryptedMasterKey,
    );
    if (!decryptedMasterKey) return;

    const friendMasterKeyRes = await fetch(
      `https://${
        friendId.split("@")[1]
      }/_takos/v1/key/masterKey?userId=${friendId}`,
    );
    const friendMasterKeyData = await friendMasterKeyRes.json();
    const friendMasterKey = friendMasterKeyData.key;
    setKeys([JSON.parse(decryptedMasterKey).publicKey, friendMasterKey]);
  });

  const handleVerify = async () => {
    const friendId = friendDetailId();
    if (!friendId) return;

    const db = await createTakosDB();
    const hashKey = await keyHash(keys()[1]);
    await db.put("allowKeys", {
      userId: friendId,
      latest: true,
      key: hashKey,
      timestamp: new Date().getTime(),
    });

    // 検証済みリストを更新
    setEncrypted((prev) => [...prev, friendId]);

    alert("鍵の検証が完了しました");
    setSelected("friend:detail"); // 詳細画面に戻る
  };

  return (
    <>
      <div class="flex items-center justify-between p-4">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setSelected("friend:detail")}
        >
          戻る
        </button>
        <h2 class="font-bold text-xl">鍵の検証</h2>
        <div class="w-10"></div> {/* バランス用の空要素 */}
      </div>

      <div class="p-4">
        <div class="p-4 bg-gray-800/70 border border-gray-700 rounded-lg space-y-6">
          <div>
            <p class="mb-2 font-medium text-blue-300">あなたのハッシュ</p>
            <p class="break-all bg-gray-900/80 p-3 rounded-lg border border-gray-700 font-mono text-green-400 text-sm">
              {hash(keys()[0]) || "読み込み中..."}
            </p>
          </div>

          <div>
            <p class="mb-2 font-medium text-blue-300">友だちのハッシュ</p>
            <p class="break-all bg-gray-900/80 p-3 rounded-lg border border-gray-700 font-mono text-green-400 text-sm">
              {hash(keys()[1]) || "読み込み中..."}
            </p>
          </div>

          <div class="border-t border-gray-700 pt-4">
            <p class="text-sm text-gray-300 mb-4">
              両方のハッシュが一致していることを確認してから、鍵を承認してください。
              別の通信手段で相手のハッシュを確認することをお勧めします。
            </p>

            <button
              onClick={handleVerify}
              class="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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
              鍵を承認する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Settings() {
  return (
    <>
      <div class="flex items-center justify-between p-4">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setSelected(null)}
        >
          戻る
        </button>
        <h2 class="font-bold text-xl">設定</h2>
        <div class="w-10"></div> {/* バランス用の空要素 */}
      </div>

      <div class="p-4">
        <ul class="space-y-3">
          <li
            class="p-4 bg-[#1e1e1e] rounded-lg hover:bg-gray-700 transition-all cursor-pointer border border-gray-700 hover:border-gray-600 hover:translate-y-[-2px]"
            onClick={() => setSelected("settings:profile")}
          >
            <div class="flex items-center gap-3">
              <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <div class="font-medium">プロフィール</div>
                <div class="text-xs text-gray-400">
                  名前、アイコン、自己紹介を編集
                </div>
              </div>
            </div>
          </li>
          <li
            class="p-4 bg-[#1e1e1e] rounded-lg hover:bg-gray-700 transition-all cursor-pointer border border-gray-700 hover:border-gray-600 hover:translate-y-[-2px]"
            onClick={() => setSelected("settings:keys")}
          >
            <div class="flex items-center gap-3">
              <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <div class="font-medium">鍵の管理</div>
                <div class="text-xs text-gray-400">
                  暗号化キーの確認と再生成
                </div>
              </div>
            </div>
          </li>
          <li
            class="p-4 bg-[#1e1e1e] rounded-lg hover:bg-gray-700 transition-all cursor-pointer border border-gray-700 hover:border-gray-600 hover:translate-y-[-2px]"
            onClick={() => setSelected("settings:account")}
          >
            <div class="flex items-center gap-3">
              <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <div class="font-medium">アカウント</div>
                <div class="text-xs text-gray-400">
                  セッション管理、ログアウト、退会
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </>
  );
}

// プロフィール設定コンポーネント
function ProfileSettings() {
  const [nickName, setNickName] = useAtom(nicknameState);
  const [icon, setIcon] = useAtom(iconState);
  const [description, setDescription] = useAtom(descriptionState);

  const [newNickName, setNewNickName] = createSignal(nickName());
  const [newDescription, setNewDescription] = createSignal(description());
  const [newIcon, setNewIcon] = createSignal(icon());

  const handleIconChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    // ファイルが画像かどうかを確認
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;

      // Base64文字列を取得（data:image/xxx;base64, プレフィックスを除去）
      const base64String = e.target.result.toString().split(",")[1];
      setNewIcon(base64String);
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    let isFailed = false;
    const iconData = newIcon();
    const nickNameData = newNickName();
    const descriptionData = newDescription();
    if (iconData !== icon()) {
      const iconRes = await fetch("/api/v2/profile/icon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ icon: iconData }),
      });
      if (iconRes.status !== 200) {
        isFailed = true;
      }
    }
    if (nickNameData !== nickName()) {
      const nickNameRes = await fetch("/api/v2/profile/nickName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickName: nickNameData }),
      });
      if (nickNameRes.status !== 200) {
        isFailed = true;
      }
    }
    if (descriptionData !== description()) {
      const descriptionRes = await fetch("/api/v2/profile/description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: descriptionData }),
      });
      if (descriptionRes.status !== 200) {
        isFailed = true;
      }
    }
    if (isFailed) {
      alert("保存に失敗しました");
    }
    setSelected("settings"); // 保存後は設定メニューに戻る
    if (iconData !== icon()) setIcon(iconData);
    if (nickNameData !== nickName()) setNickName(nickNameData);
    if (descriptionData !== description()) setDescription(descriptionData);
  };

  return (
    <div class="p-4">
      <div class="flex items-center justify-between mb-5">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          onClick={() => setSelected("settings")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          戻る
        </button>
        <h3 class="text-lg font-bold">プロフィール設定</h3>
        <div class="w-10"></div> {/* スペースバランス用 */}
      </div>

      <div class="flex flex-col items-center gap-4 py-3">
        <div class="relative group">
          <img
            src={`data:image/png;base64,${newIcon()}`}
            alt="Profile"
            class="w-24 h-24 rounded-full object-cover border-2 border-blue-500/40 shadow-lg shadow-blue-500/10"
          />
          <label
            class="absolute bottom-1 right-1 bg-blue-500 hover:bg-blue-600 rounded-full p-2 cursor-pointer transition-all transform group-hover:scale-110 shadow-lg"
            title="画像を変更"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <input
              type="file"
              class="hidden"
              accept="image/*"
              onChange={handleIconChange}
            />
          </label>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">
            {userId}
          </p>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">
          ニックネーム
        </label>
        <input
          type="text"
          value={newNickName()!}
          onInput={(e) => setNewNickName(e.target.value)}
          class="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">
          自己紹介
        </label>
        <textarea
          value={newDescription()!}
          onInput={(e) => setNewDescription(e.target.value)}
          class="w-full p-3 bg-gray-800/70 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px] resize-none"
        />
      </div>

      <button
        class="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20 transform hover:translate-y-[-1px] active:translate-y-[1px]"
        onClick={handleSave}
      >
        保存する
      </button>
    </div>
  );
}

import { showShareSignKeyPopUp } from "../encrypted/CreateIdentityKeyPopUp";

// 鍵の管理コンポーネント
function KeyManagement() {
  const deviceKey = useAtomValue(deviceKeyState);
  const setShowSHareSignKeyPopUp = useSetAtom(showShareSignKeyPopUp);
  const [masterKeyHash, setMasterKeyHash] = createSignal<string>("");
  const [latestKeyTimestamp, setLatestKeyTimestamp] = createSignal<Date | null>(
    null,
  );

  createEffect(async () => {
    // マスターキーのハッシュを取得する処理
    const encryptedMasterKey = localStorage.getItem("masterKey");
    const deviceKeyS = deviceKey();
    if (!encryptedMasterKey || !deviceKeyS) return;

    try {
      const decryptedMasterKey = await decryptDataDeviceKey(
        deviceKeyS,
        encryptedMasterKey,
      );
      if (!decryptedMasterKey) return;
      const parsedKey = JSON.parse(decryptedMasterKey);
      setMasterKeyHash(String(hash(parsedKey.publicKey)));
    } catch (error) {
      console.error("鍵の情報取得エラー:", error);
    }
    try {
      const db = await createTakosDB();
      const accountKeys = await db.getAll("accountKeys");

      if (accountKeys && accountKeys.length > 0) {
        // タイムスタンプで降順ソート
        accountKeys.sort((a, b) => b.timestamp - a.timestamp);
        const latestKey = accountKeys[0];
        // タイムスタンプをDate型に変換して保存
        setLatestKeyTimestamp(new Date(latestKey.timestamp));
      }
    } catch (error) {
      console.error("アカウント鍵の取得エラー:", error);
    }
  });

  const regenerateKeys = () => {
    // 新しい鍵を生成する処理を実装
    if (confirm("新しい鍵を生成しますか？この操作は元に戻せません。")) {
      alert("新しい鍵を生成しました。");
      // ここで実際の鍵生成処理を実装
    }
  };

  const updateAccountKey = async () => {
    if (confirm("アカウント認証鍵を更新しますか？")) {
      const masterKey = localStorage.getItem("masterKey");
      if (!masterKey) {
        alert("マスターキーがありません");
        return;
      }
      const deviceKeyS = deviceKey();
      if (!deviceKeyS) {
        alert("デバイスキーがありません");
        return;
      }
      const decryptedMasterKey = await decryptDataDeviceKey(
        deviceKeyS,
        masterKey,
      );
      if (!decryptedMasterKey) {
        alert("マスターキーの復号に失敗しました");
        return;
      }
      const masterKeyPublic = JSON.parse(decryptedMasterKey).publicKey;
      const newAccountKey = await generateAccountKey(
        JSON.parse(decryptedMasterKey),
      );
      if (!newAccountKey) {
        alert("アカウント鍵の生成に失敗しました");
        return;
      }
      const sessions: {
        uuid: string;
        encrypted: string;
        userAgent: string;
        shareKey: string;
        shareKeySign: string;
      }[] = await fetch("/api/v2/sessions/list").then((res) => res.json());
      if (!sessions) {
        alert("セッションの取得に失敗しました");
        return;
      }
      const shareData = JSON.stringify({
        privateKey: newAccountKey.privateKey,
        publicKey: newAccountKey.publickKey,
      });
      const db = await createTakosDB();
      const latestShareSignKey = await db.getAll("shareSignKeys");
      if (latestShareSignKey.length === 0) {
        setShowSHareSignKeyPopUp(true);
        return;
      }
      const shareSignKey = (latestShareSignKey.sort(
        (a, b) => b.timestamp - a.timestamp,
      ))[0].encryptedKey;
      const decryptedShareSignKey = await decryptShareSignKey({
        deviceKey: deviceKeyS,
        encryptedShareSignKey: shareSignKey,
      });
      const shareDataSign = signDataShareSignKey(
        decryptedShareSignKey.privateKey,
        shareData,
        await keyHash(decryptedShareSignKey.publicKey),
      );
      if (!shareDataSign) {
        alert("アカウント鍵の署名に失敗しました");
        return;
      }
      const encryptedAccountKeys = [];
      for (const session of sessions) {
        if (session.encrypted) {
          if (
            !verifyMasterKey(
              masterKeyPublic,
              session.shareKeySign,
              session.shareKey,
            )
          ) {
            alert("マスターキーの検証に失敗しました");
            return;
          }
          const encryptedAccountKey = await encryptDataShareKey(
            session.shareKey,
            shareData,
          );
          if (!encryptedAccountKey) {
            alert("アカウント鍵の暗号化に失敗しました");
            return;
          }
          encryptedAccountKeys.push([
            session.uuid,
            encryptedAccountKey,
          ]);
        }
      }
      const res = await fetch("/api/v2/keys/accountKey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountKey: newAccountKey.publickKey,
          accountKeySign: newAccountKey.sign,
          encryptedAccountKeys: encryptedAccountKeys,
          shareDataSign,
        }),
      });
      if (res.status !== 200) {
        alert("アカウント鍵の更新に失敗しました");
        return;
      }
      const encryptedAccountKey = await encryptAccountKey({
        deviceKey: deviceKeyS,
        accountKey: {
          privateKey: newAccountKey.privateKey,
          publicKey: newAccountKey.publickKey,
          sign: newAccountKey.sign,
        },
      });
      if (!encryptedAccountKey) {
        alert("アカウント鍵の暗号化に失敗しました");
        return;
      }
      await db.put("accountKeys", {
        key: await keyHash(newAccountKey.publickKey),
        encryptedKey: encryptedAccountKey,
        timestamp: JSON.parse(newAccountKey.publickKey).timestamp,
      });
      alert("アカウント鍵を更新しました");
    }
  };

  // 日付をフォーマットする関数
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div class="p-4">
      <div class="flex items-center justify-between mb-5">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          onClick={() => setSelected("settings")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          戻る
        </button>
        <h3 class="text-lg font-bold">鍵の管理</h3>
        <div class="w-10"></div> {/* スペースバランス用 */}
      </div>

      {/* Master Key 情報 */}
      <div class="p-4 bg-gray-800/70 border border-gray-700 rounded-lg mb-2">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </span>
          <h4 class="font-medium">あなたの公開鍵ハッシュ</h4>
        </div>
        <div class="text-sm break-all bg-gray-900/80 p-3 rounded-lg border border-gray-700 font-mono text-green-400">
          {masterKeyHash() ||
            (
              <span class="flex items-center gap-2 justify-center text-gray-400">
                <svg
                  class="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  >
                  </circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  >
                  </path>
                </svg>
                鍵情報を読み込み中...
              </span>
            )}
        </div>
        <p class="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          この値は他の人と共有して、あなたの身元を確認するのに使用できます。
        </p>

        <button
          class="w-full p-2 mt-3 bg-red-600/80 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2 group text-sm"
          onClick={regenerateKeys}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 transition-transform group-hover:rotate-180"
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
          再生成
        </button>
      </div>

      {/* Account Key 情報 */}
      <div class="p-4 bg-gray-800/70 border border-gray-700 rounded-lg">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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
          </span>
          <h4 class="font-medium">アカウント認証鍵</h4>
        </div>
        <div class="text-sm bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-gray-400 flex flex-col items-center justify-center">
          {latestKeyTimestamp()
            ? (
              <>
                <span class="text-center py-1 text-yellow-400">
                  最終生成日時: {formatDate(latestKeyTimestamp()!)}
                </span>
                <span class="text-center py-1 text-xs text-gray-500">
                  更新ボタンを押すと新しい鍵が生成されます
                </span>
              </>
            )
            : (
              <span class="text-center py-2">
                更新ボタンを押して、新しいアカウント認証鍵を生成してください。
              </span>
            )}
        </div>
        <p class="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          このアカウント認証鍵はサーバーへのログインに使用されます。
        </p>

        <button
          class="w-full p-2 mt-3 bg-blue-600/80 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 group text-sm"
          onClick={updateAccountKey}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          更新する
        </button>
      </div>

      <div class="border-t border-gray-700 pt-4 mt-4">
        <div class="text-xs text-red-400/80 bg-red-900/10 border border-red-900/20 p-3 rounded-lg">
          <p class="font-medium mb-1">⚠ 鍵の取り扱いに関する注意</p>
          <p>
            公開鍵を再生成すると、以前に検証した友だちとの暗号化チャットができなくなります。この操作は元に戻せません。
          </p>
        </div>
      </div>
    </div>
  );
}
function AccountManagement() {
  const [confirmLogout, setConfirmLogout] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [sessionInfo, setSessionInfo] = createSignal<{
    deviceName: string;
    current: boolean;
    id: string;
    encrypted: boolean;
  }[]>([]);
  const [isLoading, setIsLoading] = createSignal(true);

  // セッション情報をサーバーから取得
  // ...existing code...
  onMount(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v2/sessions/list");
      const data = await response.json();
      console.log(data);
      setSessionInfo(
        data.map(
          (s: { userAgent: any; uuid: string | null; encrypted: boolean }) => {
            const ua = s.userAgent;
            const parser = new UAParser(ua);
            const result = parser.getResult(); // ブラウザ、OS、デバイスなどの情報を取得
            console.log(result);
            const deviceName = result.os.name + " " + result.os.version;
            return {
              deviceName,
              current: s.uuid === localStorage.getItem("sessionUUID"),
              id: s.uuid,
              encrypted: !!s.encrypted, // 暗号化状態を追加
            };
          },
        ),
      );
      setIsLoading(false);
    } catch (error) {
      console.error("セッション情報の取得に失敗:", error);
      setIsLoading(false);
    }
  });
  // ...existing code...

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userName");
      localStorage.removeItem("masterKey");
      await clearDB();
      await fetch("/api/v2/sessions/logout", { method: "POST" });
      alert("ログアウトしました。");
      window.location.href = "/";
    } catch (error) {
      console.error("ログアウト中にエラーが発生しました:", error);
      alert("ログアウトに失敗しました。");
    }
  };

  const handleDeleteAccount = async () => {
    //
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      if (confirm("このセッションを終了しますか？")) {
        await fetch(`/api/v2/sessions/delete/${sessionId}`, { method: "POST" });
        alert("セッションを終了しました。");
        window.location.reload();
      }
    } catch (error) {
      console.error("セッション終了中にエラーが発生しました:", error);
      alert("セッション終了に失敗しました。");
    }
  };

  return (
    <div class="p-4">
      <div class="flex items-center justify-between mb-5">
        <button
          class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          onClick={() => setSelected("settings")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          戻る
        </button>
        <h3 class="text-lg font-bold">アカウント管理</h3>
        <div class="w-10"></div> {/* スペースバランス用 */}
      </div>

      {/* セッション情報表示部分 */}
      <div class="bg-gray-800/70 border border-gray-700 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-blue-400 bg-blue-500/10 p-2 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </span>
          <h4 class="font-medium">アクティブなセッション</h4>
        </div>

        {isLoading()
          ? (
            <div class="flex justify-center items-center py-6">
              <svg
                class="animate-spin h-6 w-6 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                >
                </circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                >
                </path>
              </svg>
            </div>
          )
          : (
            <div class="space-y-3">
              {sessionInfo().map((session) => (
                <div class="bg-gray-900/80 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-white">{session.deviceName}</span>
                      {session.current && (
                        <span class="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                          現在のデバイス
                        </span>
                      )}
                      {session.encrypted && (
                        <span class="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3 w-3"
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
                          暗号化
                        </span>
                      )}
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleTerminateSession(session.id)}
                      class="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors"
                      title="このセッションを終了"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
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
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        <p class="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          他のデバイスからのアクセスをここで管理できます。不明なセッションがある場合はすぐに終了してください。
        </p>
      </div>

      {/* アカウント操作ボタン */}
      <div class="space-y-3">
        <button
          onClick={() => setConfirmLogout(true)}
          class="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          ログアウト
        </button>
        {
          /*
        <button
          onClick={() => setConfirmDelete(true)}
          class="w-full p-3 bg-red-600/50 hover:bg-red-700/50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          アカウントを削除
        </button>*/
        }
      </div>

      {/* ログアウト確認ダイアログ */}
      {confirmLogout() && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h3 class="text-xl font-bold mb-3">ログアウトの確認</h3>
            <p class="text-gray-300 mb-4">本当にログアウトしますか？</p>
            <div class="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmLogout(false)}
                class="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleLogout}
                class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アカウント削除確認ダイアログ */}
      {confirmDelete() && (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-gray-800 p-6 rounded-lg w-full max-w-md mx-4">
            <h3 class="text-xl font-bold mb-3 text-red-400">
              アカウント削除の確認
            </h3>
            <p class="text-gray-300 mb-2">本当にアカウントを削除しますか？</p>
            <p class="text-red-400 text-sm mb-4 p-2 bg-red-900/20 rounded-md border border-red-900/20">
              この操作は取り消せません。すべての個人データ、チャット履歴、友だち関係が完全に削除されます。
            </p>
            <div class="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                class="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                class="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
