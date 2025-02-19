import { atom, useAtom, useSetAtom } from "solid-jotai";
import {
  deviceKeyState,
  domainState,
  IdentityKeyAndAccountKeyState,
  messageListState,
  messageValueState,
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
} from "../../utils/roomState";
import { Home } from "./home";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { createTakosDB } from "../../utils/idb";
export function SideBer() {
  const [page] = useAtom(pageState);

  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
      {page() === "friend" && <Friend />}
      {page() === "notification" && <Notification />}
      {page() === "talk" && <TalkList />}
    </>
  );
}

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
  createEffect(async () => {
    const match = roomid.match(/^m\{([^}]+)\}@(.+)$/);
    if (!match) {
      return
    }
    const friendUserName = match[1];
    const domainFromRoom = match[2];
    const friendUserId = friendUserName + "@" + domainFromRoom;
    const icon = (await (await fetch(`https://${domainFromRoom}/_takos/v1/user/icon/${friendUserId}`)).json()).icon
    const nickName = (await (await fetch(`https://${domainFromRoom}/_takos/v1/user/nickName/${friendUserId}`)).json()).nickName
    setNickName(nickName);
    setIcon(icon);
  });
  const setRoomKeyState = useSetAtom(roomKeyState);
  const setSelectedRoom = useSetAtom(selectedRoomState);
  const setIsSelectRoom = useSetAtom(isSelectRoomState);
  const setMessageList = useSetAtom(messageListState);
  const handelSelectRoomFriend = async (talk: any) => {
    setIsSelectRoom(true);
    setSelectedRoom(talk);
    setRoomNickName(nickName());
    if (talk.type === "friend") {
      const messages = await fetch("/api/v2/message/friend/" + talk.roomid);
      const messagesJson = (((await messages.json()).messages) as {
        userName: string;
        messageid: string;
        timestamp: string;
      }[]).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessageList(messagesJson);
    }
  };
  return (
    <div
      class="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
      onClick={async () => {
        handelSelectRoomFriend({ roomid, latestMessage, type: "friend" });
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
        <div class="text-xs text-gray-400">{(() => {
        const match = roomid.match(/^m\{([^}]+)\}@(.+)$/);
        if (!match) {
          return;
        }
        return match[1] + "@" + match[2];
      })()!}</div>
        <div class="text-sm text-gray-500">{latestMessage}</div>
      </div>
      {encrypted().includes((() => {
        const match = roomid.match(/^m\{([^}]+)\}@(.+)$/);
        if (!match) {
          return;
        }
        return match[1] + "@" + match[2];
      })()!) && (
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
  members:  {
    userId: any; role: string[] 
}[]
  channels: { category: string; id: string; name: string; permissions: { roleId: string; permission: string }[]; order: number }[]
  roles: { color: string; id: string; name: string; permission: string[] }[]
  categories: { id: string; name: string; permissions: { roleId: string; permission: string }[]; order: number }[]
  owner: string
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
  createEffect(async () => {
    const match = roomid.match(/^g\{([^}]+)\}@(.+)$/);
    if (!match) {
      return
    }
    const friendUserName = match[1];
    const domainFromRoom = match[2];
    const icon = (await (await fetch(`https://${domainFromRoom}/_takos/v1/group/icon/${friendUserName + "@" + domainFromRoom}`)).json()).icon
    const nickName = (await (await fetch(`https://${domainFromRoom}/_takos/v1/group/name/${friendUserName + "@" + domainFromRoom}`)).json()).name
    setNickName(nickName);
    setIcon(icon);
  });
  const setRoomKeyState = useSetAtom(roomKeyState);
  const setSelectedRoom = useSetAtom(selectedRoomState);
  const setIsSelectRoom = useSetAtom(isSelectRoomState);
  const setMessageList = useSetAtom(messageListState);
  const setSelectedChannel = useSetAtom(selectedChannelState);
  const handelSelectRoomFriend = async (talk: any) => {
    const match = roomid.match(/^g\{([^}]+)\}@(.+)$/);
    if (!match) {
      return
    }
    const friendUserName = match[1];
    const domainFromRoom = match[2];
    const baseUrl = `https://${domainFromRoom}/_takos/v1/group`;
    const channelsPromise = fetch(`${baseUrl}/channels/${friendUserName + "@" + domainFromRoom}`).then((res) => res.json());
    const rolePromise = fetch(`${baseUrl}/role/${friendUserName + "@" + domainFromRoom}`).then((res) => res.json());
    const membersPromise = fetch(`${baseUrl}/members/${friendUserName + "@" + domainFromRoom}`).then((res) => res.json());
    const ownerPromise = fetch(`${baseUrl}/owner/${friendUserName + "@" + domainFromRoom}`).then((res) => res.json());
    const defaultChannelPromise = fetch(`${baseUrl}/defaultChannel/${friendUserName + "@" + domainFromRoom}`).then((res) => res.json());
    
    const [channelsResult, roleResult, membersResult, ownerResult, defaultChannelResult] = await Promise.all([
      channelsPromise,
      rolePromise,
      membersPromise,
      ownerPromise,
      defaultChannelPromise,
    ]);
    
    const { channels, categories }: {
      categories: { id: string; name: string; permissions: { roleId: string; permission: string }[]; order: number }[];
      channels: { category: string; id: string; name: string; permissions: { roleId: string; permission: string }[]; order: number }[];
    } = channelsResult.channels;
    
    const role: { color: string; id: string; name: string; permission: string[] }[] = roleResult.role;
    const members: { userId: string; role: string[] }[] = membersResult.members;
    const owner: string = ownerResult.owner;
    const defaultChannelId = defaultChannelResult.defaultChannel;
    
    const messages = await fetch("/api/v2/message/group/" + talk.roomid + "/" + defaultChannelId);
    setGroupChannel({
      members: members,
      channels: channels,
      roles: role,
      categories,
      owner,
    })
    const messagesJson = (((await messages.json()).messages) as {
      userName: string;
      messageid: string;
      timestamp: string;
    }[]).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setIsSelectRoom(true);
    setSelectedRoom(talk);
    setRoomNickName(nickName());
    setSelectedChannel(defaultChannelId);
    setTimeout(() => {
      setMessageList(messagesJson);
    }, 10);
  };
  return (
    <div
      class="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[#282828]"
      onClick={async () => {
        handelSelectRoomFriend({ roomid, latestMessage, type: "group" });
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
        <div class="text-xs text-gray-400">{(() => {
        const match = roomid.match(/^g\{([^}]+)\}@(.+)$/);
        if (!match) {
          return;
        }
        return match[1] + "@" + match[2];
      })()!}</div>
        <div class="text-sm text-gray-500">{latestMessage}</div>
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

function Friend() {
  const [addFriendByIdFormOpen, setAddFriendByIdFormOpen] = createSignal(false);
  const [addFriendByIdFormInput, setAddFriendByIdFormInput] = createSignal("");
  const [domain] = useAtom(domainState);
  return (
    <>
      <button
        onClick={() => {
          setAddFriendByIdFormOpen(true);
        }}
      >
        友達をidで追加
      </button>
      {addFriendByIdFormOpen() && (
        <PopUpFrame closeScript={setAddFriendByIdFormOpen}>
          <div>
            <PopUpTitle>友達をidで追加</PopUpTitle>
            <PopUpInput
              type="text"
              placeholder="id"
              state={setAddFriendByIdFormInput}
            />
            <button
              class="w-full mt-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={async () => {
                const res = await fetch("/api/v2/friend/request", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userName: addFriendByIdFormInput(),
                  }),
                });
                if (res.status !== 200) {
                  console.log("error");
                  return;
                }
                alert("リクエストを送信しました");
              }}
            >
              追加
            </button>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}

function Request({ title, acceptFnc, rejectFnc, body}: { title: string; acceptFnc: () => void; rejectFnc: () => void; body: string; }) {
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
  )
}

function Notification() {
  const [notification] = useAtom(notificationState);
  const [domain] = useAtom(domainState);
  return (
    <>
      {notification().map((n) => {
        if (n.type === "friend") {
          return (
            <Request title="友達" acceptFnc={async () => {
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
            }} rejectFnc={() => {}} body={n.sender} />
          );
        } else if (n.type === "groupInvite") {
          return (
            <Request title="グループ招待" acceptFnc={async () => {
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
            }} rejectFnc={() => {}} body={n.query!} />
          )
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
