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
import {
  decryptDataDeviceKey,
  decryptDataShareKey,
  keyHash,
  verifyDataShareSignKey,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
import { createTakosDB } from "../utils/idb";
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
      console.log("session not found");
      return;
    }
    console.log("session");
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
      console.log("not login1");
      setLogin(false);
      setLoad(true);
      console.log("not login2");
      return;
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
    if (session.updatedAccountKeys && session.updatedAccountKeys.length > 0) {
      for (const key of session.updatedAccountKeys) {
        await saveSharedAccountKey(key, session.deviceKey);
      }
    } else {
      console.log("no updatedAccountKeys");
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
export async function saveSharedAccountKey(hash: string, deviceKey: string) {
  const sharedAccountKey = await fetch(
    "/api/v2/keys/accountKey?hash=" + encodeURIComponent(hash),
  )
    .then((res) => res.json());
  if (!sharedAccountKey) {
    return;
  }
  const shareSingKeyHash = JSON.parse(sharedAccountKey.shareDataSign).keyHash;
  const shareDataSign = await fetch(
    "/api/v2/keys/shareSignKey?hash=" + encodeURIComponent(shareSingKeyHash),
  ).then((res) => res.json());
  if (!shareDataSign) {
    return;
  }
  const decryptedMasterKey = await (async () => {
    const masterKey = localStorage.getItem("masterKey");
    if (!masterKey) {
      return;
    }
    const decryptedMasterKey = await decryptDataDeviceKey(
      deviceKey,
      masterKey,
    );
    if (
      !decryptedMasterKey
    ) {
      return;
    }
    return JSON.parse(decryptedMasterKey).publicKey;
  })();
  if (!decryptedMasterKey) {
    return;
  }
  if (
    !verifyMasterKey(
      decryptedMasterKey,
      shareDataSign.sign,
      shareDataSign.shareSignKey,
    )
  ) {
    return;
  }
  const db = await createTakosDB();
  const shareKeyHash = JSON.parse(sharedAccountKey.accountKey).keyHash;
  const encshareKey = await db.get("shareKeys", shareKeyHash);
  if (!encshareKey) {
    return;
  }
  const shareKey = await decryptDataDeviceKey(
    deviceKey,
    encshareKey.encryptedKey,
  );
  if (!shareKey) {
    return;
  }
  const accountKey = await decryptDataShareKey(
    shareKey,
    sharedAccountKey.accountKey,
  );
  if (!accountKey) {
    return;
  }
  if (
    !verifyDataShareSignKey(
      shareDataSign.shareSignKey,
      sharedAccountKey.shareDataSign,
      accountKey,
    )
  ) {
    console.log("verifyDataShareSignKey failed");
    return;
  }
  await db.put("accountKeys", {
    key: await keyHash(JSON.parse(accountKey).publicKey),
    encryptedKey: accountKey,
    timestamp: (JSON.parse(JSON.parse(accountKey).publicKey)).timestamp,
  });
  await fetch("/api/v2/keys/accountKey/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hash: await keyHash(JSON.parse(accountKey).publicKey),
    }),
  });
}
