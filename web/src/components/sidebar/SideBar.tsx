import { atom, useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  IdentityKeyAndAccountKeyState,
  messageListState,
  notificationState,
  pageState,
  talkListState,
} from "../../utils/state";
import {
  isSelectRoomState,
  nickNameState,
  roomKeyState,
  selectedChannelState,
  selectedRoomState,
} from "../../utils/room/roomState";
import { createEffect, createMemo, createSignal } from "solid-js";
import { createTakosDB } from "../../utils/storage/idb";
import { isLoadedMessageState } from "../talk/Content";
import { Home } from "../home/home";
import { createRoomSelector } from "../../utils/room/roomUtils";

export function SideBer() {
  const [page] = useAtom(pageState);

  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
      {page() === "notification" && <Notification />}
      {page() === "talk" && <TalkList />}
    </>
  );
}
export const fetchingUsersState = atom<
  Map<
    string,
    Promise<{ icon: string; nickName: string; type: "friend" | "group" }>
  >
>(
  new Map(),
);
function TalkListFriend({
  latestMessage,
  roomid,
}: {
  timestamp: string;
  latestMessage: string;
  type: "group" | "friend";
  roomid: string;
}) {
  const [nickName, setNickName] = createSignal("");
  const [icon, setIcon] = createSignal("");
  const [roomNickName, setRoomNickName] = useAtom(nickNameState);
  const [fetchingUsers, setFetchingUsers] = useAtom(fetchingUsersState);
  const [selectedRoom] = useAtom(selectedRoomState);
  createEffect(async () => {
    const match = roomid.match(/^m\{([^}]+)\}@(.+)$/);
    if (!match) {
      return;
    }
    const friendUserName = match[1];
    const domainFromRoom = match[2];
    const friendUserId = friendUserName + "@" + domainFromRoom;

    // すでに取得中または取得済みならそのPromiseを使用
    if (!fetchingUsers().has(friendUserId)) {
      // 新しく取得処理を開始し、Mapに登録
      const fetchUserInfo = async () => {
        try {
          // 並行して両方の情報を取得
          const [iconResponse, nickNameResponse] = await Promise.all([
            fetch(
              `https://${domainFromRoom}/_takos/v1/user/icon/${friendUserId}`,
            )
              .then((res) => res.json()),
            fetch(
              `https://${domainFromRoom}/_takos/v1/user/nickName/${friendUserId}`,
            )
              .then((res) => res.json()),
          ]);

          return {
            icon: iconResponse.icon,
            nickName: nickNameResponse.nickName,
            type: "friend" as const,
          };
        } catch (error) {
          console.error(
            `Failed to fetch user info for ${friendUserId}:`,
            error,
          );
          return {
            icon: "",
            nickName: friendUserId,
            type: "friend" as const,
          };
        }
      };
      const newMap = new Map(fetchingUsers());
      newMap.set(friendUserId, fetchUserInfo());
      setFetchingUsers(newMap); // アトムを通じて更新
    }

    try {
      // 取得が完了するのを待つ
      const result = await fetchingUsers().get(friendUserId);
      if (result) {
        setIcon(result.icon);
        setNickName(result.nickName);
      }
    } catch (error) {
      console.error(`Error waiting for user info: ${friendUserId}`, error);
    }
  });
  const setRoomKeyState = useSetAtom(roomKeyState);
  const setSelectedRoom = useSetAtom(selectedRoomState);
  const setIsSelectRoom = useSetAtom(isSelectRoomState);
  const setMessageList = useSetAtom(messageListState);
  const setLoadedMessageList = useSetAtom(isLoadedMessageState);

  // 新しいルーム選択関数を作成
  const selectRoom = createRoomSelector({
    setRoomNickName,
    setSelectedRoom,
    setIsSelectRoom,
    setMessageList,
    setLoadedMessageList,
    setSelectedChannel: () => {}, // フレンドチャットではチャンネルを使用しないので空関数
    setGroupChannel: () => {}, // フレンドチャットではグループチャンネルを使用しないので空関数
  });

  // 選択状態をリアクティブな関数として定義
  const isSelected = createMemo(() => {
    const current = selectedRoom();
    return current?.roomid === roomid;
  });

  return (
    <div
      class={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        isSelected() ? "bg-[#3a3a3a]" : "hover:bg-[#282828]"
      }`}
      onClick={async () => {
        selectRoom({
          roomid,
          latestMessage,
          type: "friend",
          nickName: nickName(),
        });
      }}
    >
      <img
        src={"data:image/png;base64," + icon()}
        alt="icon"
        class="w-12 h-12 rounded-full object-cover"
      />
      <div>
        <div class="font-semibold text-lg">
          {nickName()}
        </div>
        <div class="text-xs text-gray-400">
          {latestMessage}
        </div>
      </div>
      {encrypted().includes(
        (() => {
          const match = roomid.match(/^m\{([^}]+)\}@(.+)$/);
          if (!match) {
            return;
          }
          return match[1] + "@" + match[2];
        })()!,
      ) && (
        <span class="ml-auto text-gray-400 flex-shrink-0">
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

export const groupChannelState = atom<{
  members: {
    userId: any;
    role: string[];
  }[];
  channels: {
    category: string;
    id: string;
    name: string;
    permissions: { roleId: string; permissions: string[] }[];
    order: number;
  }[];
  roles: { color: string; id: string; name: string; permissions: string[] }[];
  categories: {
    id: string;
    name: string;
    permissions: { roleId: string; permissions: string[] }[];
    order: number;
  }[];
  owner: string;
}>();

function TalkGroup({
  latestMessage,
  roomid,
}: {
  timestamp: string;
  latestMessage: string;
  type: "group" | "friend";
  roomid: string;
}) {
  const [nickName, setNickName] = createSignal("");
  const [icon, setIcon] = createSignal("");
  const [roomNickName, setRoomNickName] = useAtom(nickNameState);
  const [groupChannel, setGroupChannel] = useAtom(groupChannelState);
  const setLoadedMessageList = useSetAtom(isLoadedMessageState);
  const [fetchingUsers, setFetchingUsers] = useAtom(fetchingUsersState);
  const [selectedRoom] = useAtom(selectedRoomState);
  createEffect(async () => {
    const match = roomid.match(/^g\{([^}]+)\}@(.+)$/);
    if (!match) {
      return;
    }
    const groupName = match[1];
    const domainFromRoom = match[2];
    const groupId = groupName + "@" + domainFromRoom;

    // すでに取得中または取得済みならそのPromiseを使用
    if (!fetchingUsers().has(groupId)) {
      // 新しく取得処理を開始し、Mapに登録
      const fetchGroupInfo = async () => {
        try {
          // 並行して両方の情報を取得
          const [iconResponse, nameResponse] = await Promise.all([
            fetch(`https://${domainFromRoom}/_takos/v1/group/icon/${groupId}`)
              .then((res) => res.json()),
            fetch(`https://${domainFromRoom}/_takos/v1/group/name/${groupId}`)
              .then((res) => res.json()),
          ]);

          return {
            icon: iconResponse.icon,
            nickName: nameResponse.name,
            type: "group" as const,
          };
        } catch (error) {
          console.error(`Failed to fetch group info for ${groupId}:`, error);
          return {
            icon: "",
            nickName: groupId,
            type: "group" as const,
          };
        }
      };

      const newMap = new Map(fetchingUsers());
      newMap.set(groupId, fetchGroupInfo());
      setFetchingUsers(newMap); // アトムを通じて更新
    }

    try {
      // 取得が完了するのを待つ
      const result = await fetchingUsers().get(groupId);
      if (result) {
        setIcon(result.icon);
        setNickName(result.nickName);
      }
    } catch (error) {
      console.error(`Error waiting for group info: ${groupId}`, error);
    }
  });
  const setRoomKeyState = useSetAtom(roomKeyState);
  const setSelectedRoom = useSetAtom(selectedRoomState);
  const setIsSelectRoom = useSetAtom(isSelectRoomState);
  const setMessageList = useSetAtom(messageListState);
  const setSelectedChannel = useSetAtom(selectedChannelState);

  // 新しいルーム選択関数を作成
  const selectRoom = createRoomSelector({
    setRoomNickName,
    setSelectedRoom,
    setIsSelectRoom,
    setMessageList,
    setLoadedMessageList,
    setSelectedChannel,
    setGroupChannel,
  });

  // 選択状態をリアクティブな関数として定義
  const isSelected = createMemo(() => {
    const current = selectedRoom();
    return current?.roomid === roomid;
  });

  return (
    <div
      class={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
        isSelected() ? "bg-[#3a3a3a]" : "hover:bg-[#282828]"
      }`}
      onClick={async () => {
        selectRoom({
          roomid,
          latestMessage,
          type: "group",
          nickName: nickName(),
        });
      }}
    >
      <img
        src={"data:image/png;base64," + icon()}
        alt="icon"
        class="w-12 h-12 rounded-full object-cover"
      />
      <div>
        <div class="font-semibold text-lg">
          {nickName()}
        </div>
        <div class="text-xs text-gray-400">
          {latestMessage}
        </div>
      </div>
    </div>
  );
}

const [encrypted, setEncrypted] = createSignal<string[]>([]);

function TalkList() {
  const [talkList] = useAtom(talkListState);
  const [domain] = useAtom(domainState);
  const [nickNames, setNickNames] = createSignal<{ [key: string]: string }>({});
  const [icons, setIcons] = createSignal<{ [key: string]: string }>({});
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [isSelectRoom, setIsSelectRoom] = useAtom(isSelectRoomState);
  const [identityKeyAndAccountKey] = useAtom(IdentityKeyAndAccountKeyState);
  const [deviceKey] = useAtom(deviceKeyState);
  createEffect(async () => {
    const db = await createTakosDB();
    const allowKeysData = await db.getAll("allowKeys");
    for (const allowKey of allowKeysData) {
      if (allowKey.latest === true) {
        setEncrypted((prev) => [...prev, allowKey.userId]);
      }
    }
  });

  // 選択状態の変更を監視する効果
  createEffect(() => {
    // selectedRoomの変更を検知するために依存関係として使用
    const currentRoom = selectedRoom();
    console.log("Selected room changed:", currentRoom?.roomid);
  });

  return (
    <>
      {talkList()?.map((talk) => {
        if (talk.type === "friend") {
          return (
            <TalkListFriend
              timestamp={talk.timestamp}
              latestMessage={talk.latestMessage}
              type={"friend"}
              roomid={talk.roomid}
            />
          );
        }
        if (talk.type === "group") {
          return (
            <TalkGroup
              timestamp={talk.timestamp}
              latestMessage={talk.latestMessage}
              type={"group"}
              roomid={talk.roomid}
            />
          );
        }
      })}
    </>
  );
}

function Request(
  { title, acceptFnc, rejectFnc, body }: {
    title: string;
    acceptFnc: () => void;
    rejectFnc: () => void;
    body: string;
  },
) {
  return (
    <div class="bg-[#282828] text-white p-4 rounded-lg mb-3 shadow-lg transition-transform transform border-[2px] border-white/10">
      <div class="mb-2">
        <div class="font-semibold text-lg mb-1">{title}</div>
        <div class="text-sm text-gray-300">{body}</div>
      </div>
      <div class="mt-2 flex justify-end space-x-3">
        <button
          class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
          onClick={acceptFnc}
        >
          許可
        </button>
        <button
          class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
          onClick={rejectFnc}
        >
          拒否
        </button>
      </div>
    </div>
  );
}

function Notification() {
  const [notification] = useAtom(notificationState);
  const [domain] = useAtom(domainState);
  return (
    <>
      {notification().map((n) => {
        if (n.type === "friend") {
          return (
            <Request
              title="友達"
              acceptFnc={async () => {
                const res = await fetch("/api/v2/friend/accept", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    id: n.id,
                  }),
                });
                console.log(res.json());
              }}
              rejectFnc={() => {}}
              body={n.sender}
            />
          );
        } else if (n.type === "groupInvite") {
          return (
            <Request
              title="グループ招待"
              acceptFnc={async () => {
                const res = await fetch("/api/v2/group/accept", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    groupId: n.query,
                  }),
                });
                console.log(res.json());
              }}
              rejectFnc={() => {}}
              body={n.query!}
            />
          );
        }
      })}
    </>
  );
}

function Setting() {
  const [domain] = useAtom(domainState);
  const [deviceKey] = useAtom(deviceKeyState);
  const [sahredata, setShareData] = createSignal("");
  const [shareDataSign, setShareDataSign] = createSignal("");
  const [chooseAccountKeyShareSession, setChooseAccountKeyShareSession] =
    createSignal(false);
  const [
    chooseAccountKeyShareSessionUUID,
    setChooseAccountKeyShareSessionUUID,
  ] = createSignal<[
    string, // sessionuuid
    number, //timestamp
    boolean,
    {
      keySharekey: string;
      keyShareKeySign: string;
    },
  ][]>([]);
  const [rawIdentityKeyAndAccountKey, setRawIdentityKeyAndAccountKey] =
    createSignal<{
      identityKey: {
        public: string;
        private: string;
        sign: string;
      };
      accountKey: {
        public: string;
        private: string;
        sign: string;
      };
    }>();
  return (
    <>
    </>
  );
}
