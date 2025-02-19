import { useAtom, useAtomValue } from "solid-jotai";
import {
  descriptionState,
  deviceKeyState,
  friendsState,
  iconState,
  nicknameState,
} from "../../utils/state";
import { createEffect, createSignal, onMount } from "solid-js";
import { createTakosDB } from "../../utils/idb";
import { decryptDataDeviceKey, keyHash } from "@takos/takos-encrypt-ink";
import hash from "fnv1a";

const [selected, setSelected] = createSignal<null | string>(null);

const userId = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;
export function Home() {
  const nickName = useAtomValue(nicknameState);
  const icon = useAtomValue(iconState);
  const description = useAtomValue(descriptionState);
  return (
    <>
      {selected() === null && (
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
                    src=""
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
                    src=""
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
                    src=""
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
                    src=""
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
      )}
      {selected() == "friends" && <Friends />}
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
      {friendSelected() && <FriendManue />}
      <div class="flex items-center justify-between p-4">
        <div>
          <button
            class="text-blue-500"
            onClick={() => {
              console.log("back");
              setSelected(null);
            }}
          >
            戻る
          </button>
        </div>
      </div>
      <div class="p-4">
        <h2 class="text-xl font-bold mb-2">友だちリスト</h2>
        {friends().map((friend) => (
          <TalkListFriend
            friendId={friend}
          />
        ))}
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
  createEffect(async () => {
    const icon = (await (await fetch(
      `https://${friendId.split("@")[1]}/_takos/v1/user/icon/${friendId}`,
    )).json()).icon;
    const nickName = (await (await fetch(
      `https://${friendId.split("@")[1]}/_takos/v1/user/nickName/${friendId}`,
    )).json()).nickName;
    setNickName(nickName);
    setIcon(icon);
  });
  return (
    <div
      class="flex flex-wrap items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
      onClick={async () => {
        setFriendSelected(friendId);
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
