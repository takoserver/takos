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
  MasterKeyState,
  nicknameState,
  notificationState,
  sessionidState,
  setUpState,
  talkListState,
  webSocketState,
} from "../utils/state";
import {
  migrateKeyPrivateState,
  migrateRequestPage,
  migrateSessionid,
  migrateSignKeyPublicState,
  showMigrateRequest,
} from "../utils/migrateState";
import { requester } from "../utils/requester";
import { createTakosDB, localStorageEditor } from "../utils/idb";
import { uuidv7 } from "uuidv7";
import {
  decryptDataDeviceKey,
  decryptDataShareKey,
  encryptDataDeviceKey,
  isValidkeyPairEncrypt,
  keyHash,
  signMasterKey,
  verifyMasterKey,
} from "@takos/takos-encrypt-ink";
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
  const [_load, setLoad] = useAtom(loadState);
  const [_login, setLogin] = useAtom(loginState);
  const [setUp, setSetUp] = useAtom(setUpState);
  const [deviceKey, setDeviceKey] = useAtom(deviceKeyState);
  const setWebSocket = useSetAtom(webSocketState);
  const setMasterKey = useSetAtom(MasterKeyState);
  const setIdentityKeyAndAccountKey = useSetAtom(IdentityKeyAndAccountKeyState);
  const [EncryptedSession, setEncryptedSession] = useAtom(
    EncryptedSessionState,
  );
  const [domain, setDomain] = useAtom(domainState);
  const [sessionId, setSessionid] = useAtom(sessionidState);
  const [migrateKeyPrivate] = useAtom(migrateKeyPrivateState);
  const [migrateSignKeyPublic] = useAtom(migrateSignKeyPublicState);
  const setIcon = useSetAtom(iconState);
  const setNickname = useSetAtom(nicknameState);
  const setBirthday = useSetAtom(birthdayState);
  const [notification, setNotification] = useAtom(notificationState);
  const setTalkList = useSetAtom(talkListState);
  const handleSessionFailure = () => {
    setLogin(false);
    setLoad(true);
  };
  const loadSession = async () => {
    const sessionid = localStorageEditor.get("sessionid");
    const serverDomain = localStorageEditor.get("server");
    if (!serverDomain || !sessionid) {
      handleSessionFailure();
      return;
    }
    setDomain(serverDomain);
    setSessionid(sessionid);
    const res = await requester(serverDomain, "getSessionInfo", {
      sessionid,
    });
    if (res.status !== 200) {
      handleSessionFailure();
      return;
    }
    const json = await res.json();
    if (json.error) {
      handleSessionFailure();
      return;
    }
    setEncryptedSession(json.sessionEncrypted);
    setSetUp(json.setuped);
    setDeviceKey(json.deviceKey);
    if (json.setuped && json.sessionEncrypted) {
      const encryptedMasterKey = localStorageEditor.get("masterKey");
      if (!encryptedMasterKey) {
        handleSessionFailure();
        return;
      }
      const masterKey = await decryptDataDeviceKey(
        json.deviceKey,
        encryptedMasterKey,
      );
      if (!masterKey) {
        handleSessionFailure();
        return;
      }
      setMasterKey(JSON.parse(masterKey));
      for (const key of json.share) {
        const data = await requester(serverDomain, "getShareData", {
          hash: key,
          sessionid,
        }).then((res) => res.json());
        if (data.error) {
          handleSessionFailure();
          return;
        }
        const keyShareHash = JSON.parse(data.accountKeyPrivate);
        const db = await createTakosDB();
        const encryptedkeyShareKey = await db.get(
          "shareKeys",
          keyShareHash.keyHash,
        );
        if (!encryptedkeyShareKey) {
          console.log("encryptedkeyShareKey not found");
          continue;
        }

        //const isOK = await isOk()

        const keyShare = await decryptDataDeviceKey(
          json.deviceKey,
          encryptedkeyShareKey.encryptedKey,
        );
        if (!keyShare) {
          console.log("keyShare not found");
          continue;
        }
        const accountKey = await decryptDataShareKey(
          keyShare,
          data.accountKeyPrivate,
        );
        if (!accountKey) {
          console.log("accountKey not found");
          continue;
        }
        if (
          !verifyMasterKey(
            JSON.parse(masterKey).publicKey,
            data.sign,
            data.accountKeyPublic,
          )
        ) {
          continue;
        }
        if (
          !isValidkeyPairEncrypt({
            public: data.accountKeyPublic,
            private: accountKey,
          })
        ) {
          console.log("keyPair is not valid");
          continue;
        }
        await db.put("accountKeys", {
          key: await keyHash(data.accountKeyPublic),
          encryptedKey: await encryptDataDeviceKey(
            json.deviceKey,
            accountKey,
          ) as string,
          timestamp: JSON.parse(accountKey).timestamp,
        });
        await requester(serverDomain, "noticeShareData", {
          sessionid,
          hash: key,
        });
      }
      const profile = await requester(serverDomain, "getProfile", {
        sessionid,
      }).then((res) => res.json());
      const notification = await requester(serverDomain, "getNotification", {
        sessionid,
      }).then((res) => res.json());
      if (profile.error || notification.error) {
        handleSessionFailure();
        return;
      }
      const talkList = await requester(serverDomain, "getTalkList", {
        sessionid,
      }).then((res) => res.json());
      if (talkList.error) {
        handleSessionFailure();
        return;
      }
      setTalkList(talkList.talkList);
      setNotification(notification.request);
      setIcon(profile.icon);
      setNickname(profile.nickName);
      setBirthday(profile.birthday);
      setLogin(true);
    } else {
      setLogin(true);
    }
    createWebsocket(() => {
      setLoad(true);
    });
  };
  loadSession();
  return <></>;
}
