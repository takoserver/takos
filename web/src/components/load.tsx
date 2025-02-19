import { useAtom, useSetAtom } from "solid-jotai";
import {
  birthdayState,
  descriptionState,
  deviceKeyState,
  domainState,
  EncryptedSessionState,
  friendsState,
  iconState,
  IdentityKeyAndAccountKeyState,
  loadState,
  loginState,
  nicknameState,
  notificationState,
  sessionidState,
  setUpState,
  talkListState,
  webSocketState,
} from "../utils/state";
import { createWebsocket } from "../utils/ws";
export function Loading() {
  return (
    <>
      <div class="w-full h-screen fixed z-[99999999999] flex bg-[#181818]">
        <div class="m-auto flex flex-col items-center">
          <div class="loader mb-4"></div>
          <div class="text-4xl text-center text-white">Loading...</div>
        </div>
      </div>
      <style>
        {`
        .loader {
          border: 8px solid rgba(255, 255, 255, 0.1);
          border-top: 8px solid #ffffff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}
      </style>
    </>
  );
}

const userName = localStorage.getItem("userName") + "@" +
  new URL(window.location.href).hostname;

export function Load() {
  const [load, setLoad] = useAtom(loadState);
  const [login, setLogin] = useAtom(loginState);
  const [domain] = useAtom(domainState);
  const [sessionid] = useAtom(sessionidState);
  const [setUp, setSetUp] = useAtom(setUpState);
  const [deviceKey, setDeviceKey] = useAtom(deviceKeyState);
  const setIconState = useSetAtom(iconState);
  const setnotificationState = useSetAtom(notificationState);
  const setTalkListState = useSetAtom(talkListState);
  const setEncryptedSession = useSetAtom(EncryptedSessionState);
  const setNickName = useSetAtom(nicknameState);
  const setIcon = useSetAtom(iconState);
  const setDiscription = useSetAtom(descriptionState);
  const setFriends = useSetAtom(friendsState);
  async function loadSession() {
    let sessionData;
    try {
      sessionData = await fetch("/api/v2/sessions/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      setLogin(false);
      setLoad(true);
      return;
    }
    const session = await sessionData.json();
    if (!session) {
      setLogin(false);
      setLoad(true);
      return;
    }
    if (session.login) {
      setLogin(true);
      fetch("/_takos/v1/user/nickName/" + userName, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((res) => res.json())
        .then((data) => {
          if (data.nickName) {
            setNickName(data.nickName);
          }
        });
      fetch("/_takos/v1/user/description/" + userName).then((res) => res.json())
        .then((data) => {
          if (data.description) {
            setDiscription(data.description);
          }
        });
      fetch("/_takos/v1/user/icon/" + userName).then((res) => res.json()).then(
        (data) => {
          setIcon(data.icon);
        },
      );
    } else {
      setLogin(false);
    }
    if (session.setup) {
      const icon = await fetch(
        "_takos/v1/user/icon/" + userName,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const iconData = await icon.json();
      setIconState(iconData.icon);
      setSetUp(true);
    }
    if (session.deviceKey) {
      setDeviceKey(session.deviceKey);
    }
    if (session.requests) {
      session.requests.forEach((request: any) => {
        setnotificationState((r) => [...r, {
          id: request.id,
          type: request.type,
          sender: request.sender,
          query: request.query,
          timestamp: request.timestamp,
        }]);
      });
    }
    const talkList: {
      timestamp: string;
      latestMessage: string;
      type: "group" | "friend";
      roomid: string;
    }[] = [];
    const friends: string[] = [];
    if (session.friendInfo) {
      for (const talk of session.friendInfo) {
        talkList.push({
          timestamp: "nodata",
          latestMessage: "",
          type: "friend",
          roomid: `m{${talk[0].split("@")[0]}}@${talk[0].split("@")[1]}`,
        });
        friends.push(talk[0]);
      }
    }
    if (session.encrypted) {
      setEncryptedSession(session.encrypted);
    } else {
      setEncryptedSession(false);
    }
    if (session.groupInfo) {
      for (const talk of session.groupInfo) {
        talkList.push({
          timestamp: "nodata",
          latestMessage: "",
          type: "group",
          roomid: `g{${talk[0].split("@")[0]}}@${talk[0].split("@")[1]}`,
        });
      }
    }
    setTalkListState(talkList);
    setFriends(friends);
    if (session.login) {
      createWebsocket(() => {
        setLoad(true);
      });
      return;
    } else {
      setLoad(true);
    }
  }
  loadSession();
  return <></>;
}
