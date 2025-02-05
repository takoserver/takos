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
  selectedRoomState,
} from "../../utils/roomState";
import { Home } from "./home";
import { PopUpFrame, PopUpInput, PopUpLabel, PopUpTitle } from "../popUpFrame";
import { createEffect, createSignal } from "solid-js";
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
    const friendInfo = await fetch(
      `https://${roomid.split("@")[1]}/_takos/v2/friend/info?userName=` +
        roomid.split("@")[0],
    );
    const resJson = await friendInfo.json();
    setNickName(resJson.nickName);
    setIcon(resJson.icon);
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
        <div class="text-xs text-gray-400">{roomid}</div>
        <div class="text-sm text-gray-500">{latestMessage}</div>
      </div>
    </div>
  );
}

export const groupChannelState = atom<{
  members: {
    userId: string;
    role: string[];
  }[];
  channels: {
    type: string;
    name: string;
    groupId: string;
    id: any;
    category: string | null | undefined;
    order: number;
  }[];
  roles: {
    id: any;
    name: string;
    groupId: string;
    color: string;
    permissions: string[];
  }[];
  categories: {
    id: any;
    name: string;
    groupId: string;
    order: number;
  }[];
  categoriesPermissions: {
    groupId: string;
    permissions: string[];
    categoryId: string;
    roleId: string;
  }[];
  channelsPermissions: {
    groupId: string;
    permissions: string[];
    roleId: string;
    channelId: string;
    inheritCategoryPermissions: boolean;
  }[];
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
    const groupInfo = await fetch(
      `https://${roomid.split("@")[1]}/_takos/v2/group/info?groupId=` +
        roomid,
    );
    const resJson = await groupInfo.json();
    setNickName(resJson.groupName);
    setIcon(resJson.icon);
  });
  const setRoomKeyState = useSetAtom(roomKeyState);
  const setSelectedRoom = useSetAtom(selectedRoomState);
  const setIsSelectRoom = useSetAtom(isSelectRoomState);
  const setMessageList = useSetAtom(messageListState);
  const handelSelectRoomFriend = async (talk: any) => {
    const groupInfo = await fetch(
      `https://${roomid.split("@")[1]}/api/v2/group/info?groupId=` +
        roomid,
    );
    const groupOrder = await fetch(
      `https://${roomid.split("@")[1]}/_takos/v2/group/data?groupId=` +
        roomid,
    );
    const resOrderJson = await groupOrder.json();
    const orders: {
      id: string;
      order: number;
    }[] = resOrderJson.orders;
    const owner = resOrderJson.owner;
    const defaultChannelId = resOrderJson.defaultChannelId;
    const groupInfos= await groupInfo.json();
    // groupInfos に order を追加
    groupInfos.channels = groupInfos.channels.map((channel: { id: string; }) => {
      const orderEntry = orders.find((o) => o.id === channel.id);
      return orderEntry ? { ...channel, order: orderEntry.order } : channel;
    });
    groupInfos.categories = groupInfos.categories.map((category: { id: string; }) => {
      const orderEntry = orders.find((o) => o.id === category.id);
      return orderEntry ? { ...category, order: orderEntry.order } : category;
    });
    groupInfos.channels.sort((a: { order: number; }, b: { order: number; }) => a.order - b.order);
    groupInfos.categories.sort((a: { order: number; }, b: { order: number; }) => a.order - b.order);
    setGroupChannel(groupInfos);
    const messages = await fetch(
      "/api/v2/message/group/" + talk.roomid + "/" + defaultChannelId,
    );
    const messagesJson = (((await messages.json()).messages) as {
      userName: string;
      messageid: string;
      timestamp: string;
    }[]).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setMessageList(messagesJson);
    setIsSelectRoom(true);
    setSelectedRoom(talk);
    setRoomNickName(nickName());
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
        <div class="text-xs text-gray-400">{roomid}</div>
        <div class="text-sm text-gray-500">{latestMessage}</div>
      </div>
    </div>
  );
}

function TalkList() {
  const [talkList] = useAtom(talkListState);
  const [domain] = useAtom(domainState);
  const [nickNames, setNickNames] = createSignal<{ [key: string]: string }>({});
  const [icons, setIcons] = createSignal<{ [key: string]: string }>({});
  const [selectedRoom, setSelectedRoom] = useAtom(selectedRoomState);
  const [isSelectRoom, setIsSelectRoom] = useAtom(isSelectRoomState);
  const [identityKeyAndAccountKey] = useAtom(IdentityKeyAndAccountKeyState);
  const [deviceKey] = useAtom(deviceKeyState);

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

function Notification() {
  const [notification] = useAtom(notificationState);
  const [domain] = useAtom(domainState);
  return (
    <>
      {notification().map((n) => {
        if (n.type === "friend") {
          return (
            <div class="bg-[#282828] text-white p-4 rounded-lg mb-3 shadow-lg transition-transform transform border-[2px] border-white/10">
              <div class="mb-2">
                <div class="font-semibold text-lg mb-1">友達</div>
                <div class="text-sm text-gray-300">{n.sender}</div>
              </div>
              <div class="mt-2 flex justify-end space-x-3">
                <button
                  class="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
                  onClick={async () => {
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
                >
                  許可
                </button>
                <button
                  class="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-full shadow-sm transition-all text-[14px]"
                  onClick={() => {
                    // Handle reject action
                    console.log(`Rejected notification from ${n.sender}`);
                  }}
                >
                  拒否
                </button>
              </div>
            </div>
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
