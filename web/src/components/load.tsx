import { useAtom, useSetAtom } from "solid-jotai";
import {
  birthdayState,
  deviceKeyState,
  domainState,
  EncryptedSessionState,
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
  async function loadSession() {
    const sessionData = await fetch("/api/v2/sessions/status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (sessionData.status !== 200) {
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
    } else {
      setLogin(false);
    }
    if (session.setup) {
      const icon = await fetch(
        "_takos/v2/friend/icon?userName=" + localStorage.getItem("userName"),
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
    if(session.friendInfo) {
      for (const talk of session.friendInfo) {
        talkList.push({
          timestamp: "nodata",
          latestMessage: "",
          type: "friend",
          roomid: talk[0],
        });
    }
    }
    if(session.groupInfo) {
      for (const talk of session.groupInfo) {
        talkList.push({
          timestamp: "nodata",
          latestMessage: "",
          type: "group",
          roomid: talk[0],
        });
    }
    }
    setTalkListState(talkList);
    if(session.login) {
      createWebsocket(() => {
        setLoad(true);
      })
      return
    } else {
      setLoad(true);
    }

  }
  loadSession();
  return <></>;
}
